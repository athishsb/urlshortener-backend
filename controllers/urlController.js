import { client } from "../db.js";

export function addURL(data) {
  return client.db("UrlShortener").collection("urls").insertOne(data);
}

export function getURL(data) {
  return client.db("UrlShortener").collection("urls").findOne(data);
}

export function getAllURL(email) {
  return client
    .db("UrlShortener")
    .collection("urls")
    .find({ user: email })
    .toArray();
}

export function urlDayCount(email, today) {
  return client
    .db("UrlShortener")
    .collection("urls")
    .find({ user: email, createdOn: { $eq: today } })
    .toArray();
}

export function urlMonthCount(email, date) {
  return client
    .db("UrlShortener")
    .collection("urls")
    .find({ user: email, createdOn: { $gte: date } })
    .toArray();
}

export function updateCount(id) {
  return client
    .db("UrlShortener")
    .collection("urls")
    .findOneAndUpdate(
      { urlID: id },
      { $inc: { clicked: 1 } },
      { returnDocument: "after" }
    );
}
