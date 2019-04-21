const superChain = (obj, chain) => {
    return chain.reduce((acc, c) => {
        return Array.isArray(c)
            ? acc[c[0]](c[1])
            : acc[c];
    }, obj);
}

module.exports = {
    superChain,
}
