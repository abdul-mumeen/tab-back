const formatKnexError = (error, fallback) => {
    // MYSQL 
    const mySQLcodes = {
        ER_BAD_FIELD_ERROR: () => error.message.split('ER_BAD_FIELD_ERROR: ')[1],
        ER_DUP_ENTRY: () => error.message.split('ER_DUP_ENTRY: ')[1],
    }

    // POSTGRES
    const postgresCodes = {
        23505: () => {
            const msg = 'duplicate key value violates unique constraint';
            return `${msg} ${error.message.split(msg)[1]}`;
        }
    }

    if (mySQLcodes[error.code]) {
        return mySQLcodes[error.code]();
    } else if (postgresCodes[error.code]){
        return postgresCodes[error.code]();
    }
    return fallback;
}

module.exports = {
    formatKnexError,
}
