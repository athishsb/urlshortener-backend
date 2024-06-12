import express from "express";
import {
  addURL,
  getAllURL,
  updateCount,
  urlDayCount,
  urlMonthCount,
} from "../controllers/urlController.js";

const router = express.Router();

//8
router.post("/createURL", async (req, res) => {
  try {
    function generateShortId(length) {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      return result;
    }
    const id = generateShortId(7);
    //console.log("Generated ID: " + id);
    const shortURL = "/" + id;
    const data = { ...req.body, shortURL: shortURL, urlID: id, clicked: 0 };
    const result = await addURL(data);
    if (!result.acknowledged) {
      return res
        .status(404)
        .json({ message: "Error uploading url information" });
    }
    res.status(200).json({ result: result, data: data });
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//9
// get all URL for an user
router.post("/all", async (req, res) => {
  try {
    //console.log("get all url");
    //console.log(req.body);
    if (!req.body.email) {
      return res.status(400).json({ message: "User not found" });
    }
    const urlList = await getAllURL(req.body.email);

    if (!urlList) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ data: urlList });
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//10
// get today URL and count
router.post("/today", async (req, res) => {
  //console.log("get all url today");
  //console.log(req.body);
  if (!req.body.email) {
    return res.status(400).json({ message: "User not found" });
  }
  try {
    const urlList = await urlDayCount(req.body.email, req.body.today);
    if (!urlList) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ data: urlList });
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//11
// get current month URL and count
router.post("/monthly", async (req, res) => {
  //console.log("get all url this month");
  //console.log(req.body);
  try {
    const urlList = await urlMonthCount(req.body.email, req.body.date);

    if (!urlList) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ data: urlList });
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//12
// update number of clicks for an URL
router.post("/clickcount", async (req, res) => {
  //console.log("update click count");
  //console.log(req.body);
  try {
    const updateURL = await updateCount(req.body.id);

    if (!updateURL) {
      return res.status(404).json({ message: "No data found" });
    }
    res.status(200).json({ data: updateURL });
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export const urlRouter = router;
