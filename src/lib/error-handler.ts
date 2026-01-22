/**
 * Centralized Error Handling
 * Maps technical errors to user-friendly messages
 */

export interface AppError {
    code: string;
    message: string;
    userMessage: string;
    recoverable: boolean;
    action?: string;
}

// Error codes
export enum ErrorCode {
    // Wallet errors
    WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
    WALLET_REJECTED = 'WALLET_REJECTED',
    WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
    
    // Transaction errors
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
    
    // Contract errors
    CONTRACT_NOT_DEPLOYED = 'CONTRACT_NOT_DEPLOYED',
    INVALID_INVOICE_ID = 'INVALID_INVOICE_ID',
    INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
    INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVOICE_NOT_DUE = 'INVOICE_NOT_DUE',
    INVOICE_ALREADY_SETTLED = 'INVOICE_ALREADY_SETTLED',
    
    // Validation errors
    INVALID_AMOUNT = 'INVALID_AMOUNT',
    INVALID_DATE = 'INVALID_DATE',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    
    // Network errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    RPC_ERROR = 'RPC_ERROR',
    
    // Unknown errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error message mappings
const ERROR_MESSAGES: Record<ErrorCode, { userMessage: string; recoverable: boolean; action?: string }> = {
    [ErrorCode.WALLET_NOT_CONNECTED]: {
        userMessage: 'Please connect your wallet to continue',
        recoverable: true,
        action: 'Connect Wallet',
    },
    [ErrorCode.WALLET_REJECTED]: {
        userMessage: 'Wallet connection was rejected. Please try again.',
        recoverable: true,
    },
    [ErrorCode.WALLET_NOT_FOUND]: {
        userMessage: 'Freighter wallet not found. Please install Freighter extension.',
        recoverable: true,
        action: 'Install Freighter',
    },
    [ErrorCode.TRANSACTION_FAILED]: {
        userMessage: 'Transaction failed. Please check your balance and try again.',
        recoverable: true,
    },
    [ErrorCode.TRANSACTION_TIMEOUT]: {
        userMessage: 'Transaction timed out. Please refresh and try again.',
        recoverable: true,
    },
    [ErrorCode.INSUFFICIENT_BALANCE]: {
        userMessage: 'Insufficient balance. Please add funds to your wallet.',
        recoverable: true,
        action: 'Add Funds',
    },
    [ErrorCode.TRANSACTION_REJECTED]: {
        userMessage: 'Transaction was rejected. Please approve the transaction in your wallet.',
        recoverable: true,
    },
    [ErrorCode.CONTRACT_NOT_DEPLOYED]: {
        userMessage: 'Contract not found. Please check your network connection.',
        recoverable: true,
    },
    [ErrorCode.INVALID_INVOICE_ID]: {
        userMessage: 'Invalid invoice ID. Please check and try again.',
        recoverable: false,
    },
    [ErrorCode.INVOICE_NOT_FOUND]: {
        userMessage: 'Invoice not found. It may have been deleted or does not exist.',
        recoverable: false,
    },
    [ErrorCode.INVALID_STATUS_TRANSITION]: {
        userMessage: 'Cannot perform this action. Invoice status does not allow this operation.',
        recoverable: false,
    },
    [ErrorCode.UNAUTHORIZED]: {
        userMessage: 'You are not authorized to perform this action.',
        recoverable: false,
    },
    [ErrorCode.INVOICE_NOT_DUE]: {
        userMessage: 'Invoice is not due yet. Please wait until the due date.',
        recoverable: false,
    },
    [ErrorCode.INVOICE_ALREADY_SETTLED]: {
        userMessage: 'This invoice has already been settled.',
        recoverable: false,
    },
    [ErrorCode.INVALID_AMOUNT]: {
        userMessage: 'Invalid amount. Please enter a positive number.',
        recoverable: true,
    },
    [ErrorCode.INVALID_DATE]: {
        userMessage: 'Invalid date. Please select a future date.',
        recoverable: true,
    },
    [ErrorCode.MISSING_REQUIRED_FIELD]: {
        userMessage: 'Please fill in all required fields.',
        recoverable: true,
    },
    [ErrorCode.NETWORK_ERROR]: {
        userMessage: 'Network error. Please check your internet connection and try again.',
        recoverable: true,
    },
    [ErrorCode.RPC_ERROR]: {
        userMessage: 'Blockchain connection error. Please try again in a moment.',
        recoverable: true,
    },
    [ErrorCode.UNKNOWN_ERROR]: {
        userMessage: 'An unexpected error occurred. Please try again.',
        recoverable: true,
    },
};

/**
 * Parse error and return user-friendly message
 */
export function parseError(error: unknown): AppError {
    const errorString = String(error).toLowerCase();
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for specific error patterns
    if (errorMessage.includes('not connected') || errorMessage.includes('wallet')) {
        return createError(ErrorCode.WALLET_NOT_CONNECTED, errorMessage);
    }

    if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        if (errorMessage.includes('transaction')) {
            return createError(ErrorCode.TRANSACTION_REJECTED, errorMessage);
        }
        return createError(ErrorCode.WALLET_REJECTED, errorMessage);
    }

    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        return createError(ErrorCode.INSUFFICIENT_BALANCE, errorMessage);
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return createError(ErrorCode.TRANSACTION_TIMEOUT, errorMessage);
    }

    if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        if (errorMessage.includes('invoice')) {
            return createError(ErrorCode.INVOICE_NOT_FOUND, errorMessage);
        }
        return createError(ErrorCode.CONTRACT_NOT_DEPLOYED, errorMessage);
    }

    if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
        return createError(ErrorCode.UNAUTHORIZED, errorMessage);
    }

    if (errorMessage.includes('not due') || errorMessage.includes('due date')) {
        return createError(ErrorCode.INVOICE_NOT_DUE, errorMessage);
    }

    if (errorMessage.includes('already settled') || errorMessage.includes('settled')) {
        return createError(ErrorCode.INVOICE_ALREADY_SETTLED, errorMessage);
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        return createError(ErrorCode.NETWORK_ERROR, errorMessage);
    }

    if (errorMessage.includes('rpc') || errorMessage.includes('soroban')) {
        return createError(ErrorCode.RPC_ERROR, errorMessage);
    }

    // Contract-specific error patterns
    if (errorString.includes('panic') || errorString.includes('assert')) {
        // Try to extract meaningful message
        if (errorString.includes('not pending')) {
            return createError(ErrorCode.INVALID_STATUS_TRANSITION, errorMessage);
        }
        if (errorString.includes('not verified')) {
            return createError(ErrorCode.INVALID_STATUS_TRANSITION, errorMessage);
        }
        if (errorString.includes('not listed')) {
            return createError(ErrorCode.INVALID_STATUS_TRANSITION, errorMessage);
        }
        if (errorString.includes('not sold')) {
            return createError(ErrorCode.INVALID_STATUS_TRANSITION, errorMessage);
        }
        if (errorString.includes('not the owner')) {
            return createError(ErrorCode.UNAUTHORIZED, errorMessage);
        }
        if (errorString.includes('only designated buyer')) {
            return createError(ErrorCode.UNAUTHORIZED, errorMessage);
        }
        if (errorString.includes('only original buyer')) {
            return createError(ErrorCode.UNAUTHORIZED, errorMessage);
        }
    }

    return createError(ErrorCode.UNKNOWN_ERROR, errorMessage);
}

/**
 * Create error object
 */
function createError(code: ErrorCode, message: string): AppError {
    const errorInfo = ERROR_MESSAGES[code];
    return {
        code,
        message,
        userMessage: errorInfo.userMessage,
        recoverable: errorInfo.recoverable,
        action: errorInfo.action,
    };
}

/**
 * Handle error and show toast notification
 */
export function handleError(error: unknown, context?: string): AppError {
    const appError = parseError(error);
    
    console.error(`[${context || 'Error'}]`, {
        code: appError.code,
        message: appError.message,
        original: error,
    });

    return appError;
}

/**
 * Validate invoice creation data
 */
export function validateInvoiceData(data: {
    buyerName?: string;
    amount?: number;
    dueDate?: Date;
}): { valid: boolean; error?: AppError } {
    if (!data.buyerName || data.buyerName.trim() === '') {
        return { valid: false, error: createError(ErrorCode.MISSING_REQUIRED_FIELD, 'Buyer name is required') };
    }

    if (!data.amount || data.amount <= 0) {
        return { valid: false, error: createError(ErrorCode.INVALID_AMOUNT, 'Amount must be greater than 0') };
    }

    if (!data.dueDate) {
        return { valid: false, error: createError(ErrorCode.MISSING_REQUIRED_FIELD, 'Due date is required') };
    }

    if (data.dueDate <= new Date()) {
        return { valid: false, error: createError(ErrorCode.INVALID_DATE, 'Due date must be in the future') };
    }

    return { valid: true };
}

/**
 * Validate listing price
 */
export function validateListingPrice(price: number, invoiceAmount: number): { valid: boolean; error?: AppError } {
    if (price <= 0) {
        return { valid: false, error: createError(ErrorCode.INVALID_AMOUNT, 'Price must be greater than 0') };
    }

    if (price > invoiceAmount) {
        return { valid: false, error: createError(ErrorCode.INVALID_AMOUNT, 'Price cannot exceed invoice amount') };
    }

    if (price === invoiceAmount) {
        return { valid: false, error: createError(ErrorCode.INVALID_AMOUNT, 'Price must be less than invoice amount to offer a discount') };
    }

    return { valid: true };
}
