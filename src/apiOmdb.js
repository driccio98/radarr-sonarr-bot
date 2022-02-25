import axios from "axios";

export default class omdbApi {
    constructor(token) {
        this.token = token;
        this.requestUrl = "http://www.omdbapi.com/?apikey=";

        this.INVALID_PARAMS =
            new Error("The parameters passed to this method are invalid");
    }

    getMovieFromImdbId(imdbId) {
        let imdbIdRegex = /^tt[0-9]*$/;
        if (imdbIdRegex.test(imdbId)) {
            return axios.get(this.requestUrl + this.token + "&i=" + imdbId)
                .then((response) => {
                    return Promise.resolve(response.data);
                })
                .catch((error) => {
                    return Promise.reject(error);
                });
        }
        return this.INVALID_PARAMS;
    }

}