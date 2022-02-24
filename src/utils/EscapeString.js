export function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,!\\^$|#]/g, "\\$&");
}

export function removeRegExp(text) {
    return text.replace(/[[\]{}()*+?.,!\\^$|#]/g, "");
}