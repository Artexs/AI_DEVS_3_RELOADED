require('dotenv').config();
const axios = require('axios');

const input_data = `${process.env.POLIGON_URL}/dane.txt`;
const apiUrl = `${process.env.POLIGON_URL}/verify`;

async function fetchAndPostData() {
    try {
        const { data } = await axios.get(input_data);
        const answer = data.split('\n').filter(Boolean);

        const { data: result } = await axios.post(apiUrl, {
            task: "FLG",
            apikey: process.env.POLIGON_API,
            // answer,
            FLG: "WALKAZCZASEM"
        });

        return result;
    } catch (err) {
        console.error('Request failed:', err.response?.data || err.message);
        throw err;
    }
}

fetchAndPostData()
    .then(result => {
        console.log(result);
    })
    .catch(error => {
        console.error('Operation failed');
    });