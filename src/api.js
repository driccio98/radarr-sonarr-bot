import axios from "axios";

export default class Api {
    constructor(token){
        this.token = token;

        this.RADARR_URI = "https://daniflix.ddns.net/radarr/api/v3/";

        this.INVALID_PARAMS = new Error("The parameters passed to this method are invalid");
    }

    moviesLookup(searchTerm){
        if (!searchTerm && searchTerm.length < 0) {
            return this.INVALID_PARAMS;
        }

        const apiUrl = `${this.RADARR_URI}movie/lookup?term=${searchTerm}&apiKey=${this.token}`;
        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        });  

    }

    getQualityProfiles(){
        const apiUrl = `${this.RADARR_URI}qualityProfile?&apiKey=${this.token}`;

        return axios.get(apiUrl).then((response) => {
            return Promise.resolve(response.data);
        }).catch((error) => {
            return Promise.reject(error);
        }); 
    }

}