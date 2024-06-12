//console.log("URL Shortener");
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { userRouter } from "./routes/userRoute.js";
import { urlRouter } from "./routes/urlRoute.js";
import { isAuthenticated } from "./middleware/authMiddleware.js";
import { getURL } from "./controllers/urlController.js";

dotenv.config();
const PORT = process.env.PORT;
const app = express();

// application middleware
app.use(express.json());
app.use(cors());

// import routes
app.use("/user", userRouter);
app.use("/url", isAuthenticated, urlRouter);

app.get("/", (req, res) => {
  res.send("🙋‍♂️, Welcome to URL shortener app!");
});

// To get URL redirection from short URL
app.get("/:urlID", async (req, res) => {
  try {
    const url = await getURL({ urlID: req.params.urlID });
    if (url) {
      //console.log("redirecting");
      return res.status(200).json({ longURL: url.longURL });
    } else {
      return res.status(404).json({ message: "No URL found" });
    }
  } catch (err) {
    //console.log(err);
    res.status(500).json("Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
