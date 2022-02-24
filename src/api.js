import axios from "axios";
import _ from "lodash";

export default class Api {
    constructor(token) {
        this.token = token;

        this.RADARR_URI = "https://daniflix.ddns.net/radarr/api/v3/";

        this.INVALID_PARAMS = new Error("The parameters passed to this method are invalid");
    }
    //Getters
    getAllMovies() {
        const apiUrl = `${this.RADARR_URI}movie?apiKey=${this.token}`;
        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    getLastMovieId() {
        return this.getAllMovies().then((movies) => {
            let sortedById = _.sortBy(movies, [function (o) { return o.id; }]);
            let lastMovieId = sortedById[sortedById.length - 1].id;
            return Promise.resolve(lastMovieId);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    getMoviesByTerm(searchTerm) {
        if (!searchTerm && searchTerm.length < 0) {
            return Promise.reject(this.INVALID_PARAMS);
        }

        const apiUrl = `${this.RADARR_URI}movie/lookup?term=${searchTerm}&apiKey=${this.token}`;
        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });

    }

    getQualityProfiles() {
        const apiUrl = `${this.RADARR_URI}qualityProfile?&apiKey=${this.token}`;

        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    //Setters
    addNewMovie(movieObject) {

        if(!movieObject){
            return Promise.reject(this.INVALID_PARAMS);
        }

        return this.getLastMovieId().then((id) => {
            movieObject.id = id + 1;
            movieObject.monitored = true;

            const apiUrl = `${this.RADARR_URI}movie?apiKey=${this.token}`;
            return axios.post(apiUrl, movieObject).then((response) => {
                return Promise.resolve(response.data);
            }).catch((error) => {
                return Promise.reject(error);
            });

        }).catch((error) => {
            return Promise.reject(error);
        });

    }

    //Only to change quality profiles and monitored status (for now ;) 
    editMovie(movieObject){
        const apiUrl = `${this.RADARR_URI}movie?apiKey=${this.token}`;
        return axios.put(apiUrl, movieObject).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

}