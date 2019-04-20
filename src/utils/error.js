const formatKnexError = (error, fallback) => {
    const codes = {
        ER_BAD_FIELD_ERROR: () => error.message.split('ER_BAD_FIELD_ERROR: ')[1],
        ER_DUP_ENTRY: () => error.message.split('ER_DUP_ENTRY: ')[1],
    }

    return codes[error.code]
        ?  codes[error.code]()
        : fallback;
}


module.exports = {
    formatKnexError,
}
