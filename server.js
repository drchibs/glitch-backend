const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const csv = require("csvtojson");
const axios = require("axios").default;
const cryptoRandomString = require("crypto-random-string");
const xss = require("xss-clean");
const fs = require("fs");
const http = require("http");

const app = express();

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(xss());

const port = 3000;

const downloadRemoteFile = async (url, destination, res) => {
	try {
		await axios({
			method: "get",
			url: url,
			responseType: "stream",
		}).then((response) => {
			response.data.pipe(fs.createWriteStream(destination));
		});
	} catch (err) {
		res.status(500).json({
			status: "fail",
			message: err.message,
		});
	}
};

/**
 * for the lack of a better name for the handler
 * @returns a JSON object containing the data from the csv file in json format and a random identifier
 */
const doTheWork = async (req, res) => {
	//get the 2 required params
	const url = req.body.csv.url;
	const fields = req.body.csv.select_fields;
	//local file placeholder
	const file = "./data-files/data.csv";
	try {
		//download the file and save to local folder
		const request = await downloadRemoteFile(url, file, res);

		//csvtojson
		const json = await csv().fromFile("./data.csv");

		//unique identifier
		const identifier = cryptoRandomString({
			length: 32,
			type: "alphanumeric",
		});
		//placeholder for new truncated json data based on selected_fields
		const selectedData = [];

		//assign a new object- target: selectedData, source: fields.map returning json[field]
		if (fields) {
			for (let row in json) {
				selectedData.push(
					Object.assign(
						{},
						...fields.map((key) => ({ [key]: json[row][key] }))
					)
				);
			}
		}

		//send a json response in the required format
		res.status(200).json({
			conversion_key: identifier,
			json: fields ? selectedData : json,
		});
	} catch (err) {
		res.status(400).json({
			status: "fail",
			message: err.message,
		});
	}
};

//setup the single endpoint for access
app.post("/", doTheWork);

//start the server
const server = app.listen(port, () => {
	console.log(`Glitch Backend App running on port ${port}...`);
});
