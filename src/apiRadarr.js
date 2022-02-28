import axios from "axios";
import _ from "lodash";

export default class radarrApi {
    constructor(token) {
        this.token = token;

        this.requestUrl = "https://daniflix.ddns.net/radarr/api/v3/";

        this.INVALID_PARAMS = new Error("The parameters passed to this method are invalid");
    }
    //Getters
    getAllMovies() {
        const apiUrl = `${this.requestUrl}movie?apiKey=${this.token}`;
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

        const apiUrl = `${this.requestUrl}movie/lookup?term=${searchTerm}&apiKey=${this.token}`;
        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });

    }

    getQualityProfiles() {
        const apiUrl = `${this.requestUrl}qualityProfile?&apiKey=${this.token}`;

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

            const apiUrl = `${this.requestUrl}movie?apiKey=${this.token}`;
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
        const apiUrl = `${this.requestUrl}movie?apiKey=${this.token}`;
        return axios.put(apiUrl, movieObject).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    //Get root folder paths
    getPaths(){
        const apiUrl = `${this.requestUrl}rootFolder?apiKey=${this.token}`;
        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

}