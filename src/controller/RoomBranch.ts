import Log from "../Util";
import {InsightDataset, InsightDatasetKind, InsightError, ResultTooLargeError} from "./IInsightFacade";
import {JSZipObject} from "jszip";
import * as JSZip from "jszip";
import {CourseSection} from "./InsightFacade";
import CheckValid from "./CheckValid";
import * as http from "http";
import {rejects} from "assert";
import {inspect} from "util";
// import styles = module;
const parse5 = require("parse5");
const fs = require("fs");
let numRows: number = 0;
let buildingNames: string[] = [];
let realBuildingsMap: Map<string, BuildingDetails> = new Map<string, BuildingDetails>();
let RoomArray: any[] = [];
let allRooms: any[] = [];

export interface BuildingDetails {
    Datatype: string;
    building_fullname: string;
    building_shorname: string;
    building_address: string;
    building_href: string;
    building_lat: number;
    building_lon: number;
}

export interface Room {
    rooms_fullname: string;
    rooms_shortname: string;
    rooms_number: string;
    rooms_name: string;
    rooms_address: string;
    rooms_lat: number;
    rooms_lon: number;
    rooms_seats: number;
    rooms_type: string;
    rooms_furniture: string;
    rooms_href: string;
}

export default class RoomBranch {
    private roomList: any[];

    constructor() {
        this.roomList = [];
    }

    public addData(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this, PromiseRoomsArr: any[] = [];
        let zip = new JSZip();
        return new Promise((resolve, reject) => {
            zip.loadAsync(content, {base64: true}).then(function (AllFiles) {
                AllFiles.file("rooms/index.htm").async("text").then((indexFile) => {
                    let DocObj = parse5.parse(indexFile);
                    return self.collectBuildingInfo(id, DocObj, AllFiles);
                }).then((roomList: any) =>  {
                    resolve(roomList);
                }).catch((err: any) => {
                    reject(new InsightError());
                });
            }).catch((err: any) => {
                reject(new InsightError());
            });
        });
    }

    public collectBuildingInfo(idname: string, parsedDocument: any, jsonFiles: any): Promise<any> {
        let self = this;
        let buildingObjs: BuildingDetails[] = [];
        let ProList: any[] = [];
        return new Promise((resolve, reject) => {
            let tableBodyLines = this.findGetTBodyLines(parsedDocument);
            for (let oneBuildLine of tableBodyLines) {
                ///
                let aNewBuilding = {
                    building_address: "", building_fullname: "", building_shorname: "",
                    building_href: "", Datatype: "", building_lon: 0, building_lat: 0
                } as BuildingDetails;
                for (let aFieldChild of oneBuildLine.childNodes) {
                    if (this.isTD(aFieldChild) && !this.NotDefined(aFieldChild.attrs[0])) {
                        if (this.checkVluefield(aFieldChild, "views-field views-field-field-building-code")) {
                            aNewBuilding.building_shorname = aFieldChild.childNodes[0].value.trim();
                        } else if (this.checkVluefield(aFieldChild, "views-field views-field-title")) {
                            aNewBuilding.building_fullname = aFieldChild.childNodes[1].childNodes[0].value.trim();
                        } else if (this.checkVluefield(aFieldChild, "views-field views-field-field-building-address")) {
                            aNewBuilding.building_address = aFieldChild.childNodes[0].value.trim();
                        } else if (this.checkVluefield(aFieldChild, "views-field views-field-nothing")) {
                            aNewBuilding.building_href = aFieldChild.childNodes[1].attrs[0].value;
                        }
                    }
                }
                aNewBuilding.Datatype = idname;
                ///
                buildingObjs.push(aNewBuilding);
                buildingNames.push(aNewBuilding.building_shorname);
                realBuildingsMap.set(aNewBuilding.building_shorname, aNewBuilding);
                ///
                let aPromise = self.makeRooms(aNewBuilding, jsonFiles, idname);
                ProList.push(aPromise);
            }
            Promise.all(ProList).then(() => {
                if (self.roomList.length !== 0) {
                    return resolve(self.roomList);
                } else {
                    return reject("zero rooms");
                }
            }).catch((e: any) => {
                reject(new InsightError());
            });
        });
    }

    public findGetTBodyLines(file: any): any {
        let self = this;
        let tableLineContents: any [] = [];
        if ((file.nodeName === "tbody")) {
            for (let aChildNode of file.childNodes) {
                if (self.isTR(aChildNode)) {
                    tableLineContents.push(aChildNode);
                }
            }
            return tableLineContents;
        } else if (!self.NotDefined(file.childNodes)) {
            for (let aChildNode of file.childNodes) {
                tableLineContents = self.findGetTBodyLines(aChildNode);
                if (tableLineContents.length !== 0) {
                    return tableLineContents;
                }
            }
        } else {
            return tableLineContents;
        }
        return tableLineContents;
    }

    public makeRooms(oneBuilDetail: BuildingDetails, unzippedfiles: any, id: string): Promise<any> {
        let self = this;
        return new Promise((resolve, reject) => {
            self.extractGeolocation(oneBuilDetail.building_address, id).then((GeoLocationPair) => {
                if (!(self.NotDefined(GeoLocationPair.lat)) && !(self.NotDefined(GeoLocationPair.lon))) {
                    let currFileAddress =
                        "rooms/campus/discover/buildings-and-classrooms/" + oneBuilDetail.building_shorname;
                    unzippedfiles.file(currFileAddress).async("text").then((textBuHtml: any) => {
                        try {
                            let currParsedBuildingHTML = parse5.parse(textBuHtml);
                            let upLatLonBuildInfomation = oneBuilDetail;
                            upLatLonBuildInfomation.building_lat = GeoLocationPair.lat;
                            upLatLonBuildInfomation.building_lon = GeoLocationPair.lon;
                            self.makeRoomObject(upLatLonBuildInfomation, id, currParsedBuildingHTML);
                            let debugbreakLine;
                            return resolve();
                        } catch (e) {
                            return resolve();
                        }
                    }).catch((e: any) => {
                        return resolve();
                    });
                }
            }).catch((err: any) => {
                return resolve();
            });
        });

    }

    public makeRoomObject(BuildInfomation: BuildingDetails, id: string, BuildinSubHTML: any) {
        let self = this, promiselist: any[] = [], DocFileObj = BuildinSubHTML;
        let TrRooms: any = self.findGetTBodyLines(DocFileObj);
        let ddd = this;
        for (let aRoom of TrRooms) {
            let aNewRoom: Room, roomObject: any = new Object();
            roomObject[id + "_fullname"] = BuildInfomation.building_fullname;
            roomObject[id + "_shortname"] = BuildInfomation.building_shorname;
            roomObject[id + "_number"] = null;
            roomObject[id + "_name"] = null;
            roomObject[id + "_address"] = BuildInfomation.building_address;
            roomObject[id + "_lat"] = BuildInfomation.building_lat;
            roomObject[id + "_lon"] = BuildInfomation.building_lon;
            roomObject[id + "_seats"] = null;
            roomObject[id + "_type"] = null;
            roomObject[id + "_furniture"] = null;
            roomObject[id + "_href"] = BuildInfomation.building_href;
            for (let aBlock of aRoom.childNodes) {
                // let aNewRoom: Room, roomObject: any = new Object();
                if (this.isTD(aBlock)) {
                    // roomObject[self.id + "_fullname"] = "";
                    // for (let aBlock of aBlock.childNodes) {
                    if (self.checkVluefield(aBlock,
                        "views-field views-field-field-room-number")) {
                        roomObject[id + "_number"] = aBlock.childNodes[1].childNodes[0].value;
                        roomObject[id + "_name"] = roomObject[id + "_shortname"] + "_" + roomObject[id + "_number"];
                    }
                    if (self.checkVluefield(aBlock,
                        "views-field views-field-field-room-capacity")) {
                        roomObject[id + "_seats"] = aBlock.childNodes[0].value.trim();
                    }
                    if (self.checkVluefield(aBlock,
                        "views-field views-field-field-room-type")) {
                        roomObject[id + "_type"] = aBlock.childNodes[0].value.trim();
                    }
                    if (self.checkVluefield(aBlock,
                        "views-field views-field-field-room-furniture")) {
                        roomObject[id + "_furniture"] = aBlock.childNodes[0].value.trim();
                    }
                    if (self.checkVluefield(aBlock,
                        "views-field views-field-nothing")) {
                        roomObject[id + "_href"] = aBlock.childNodes[1].attrs[0].value;
                    }
                }
            }
            if (!self.NotDefined(roomObject[id + "_number"]) || !self.NotDefined(roomObject[id + "_name"]) ||
                !self.NotDefined(roomObject[id + "_address"]) || !self.NotDefined(roomObject[id + "_lat"]) ||
                !self.NotDefined(roomObject[id + "_lon"]) || !self.NotDefined(roomObject[id + "_seats"]) ||
                !self.NotDefined(roomObject[id + "_furniture"]) || !self.NotDefined(roomObject[id + "_type"])) {
                self.roomList.push(roomObject);
            }
        }
    }


    public checkVluefield(aTD: any, fieldName: string) {
        return (aTD.attrs[0].value === fieldName);
    }

    public isTR(node: any): boolean {
        if (node.nodeName === "tr" && !this.NotDefined(node.childNodes)) {
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }

    public isTD(node: any): boolean {
        if (node.nodeName === "td") {
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }

    public NotDefined(content: any): boolean {
        if (content === null || content === undefined) {
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }

    public extractGeolocation(address: string, id: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let urlAddress = encodeURI(address);
            let geoOutput: any;
            let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team059/" + urlAddress;
            http.get(url, (res) => {
                const {statusCode} = res;
                const contentType = res.headers["content-type"];
                let error;
                if (statusCode === 404) { // !==200 or ===404 ???
                    error = new InsightError("404");
                    resolve(error);
                } else if (!/^application\/json/.test(contentType)) {
                    error = new InsightError("Invalid format");
                    resolve(error);
                }
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        geoOutput = JSON.parse(rawData);
                        if (geoOutput.hasOwnProperty("lat")) {
                            resolve(geoOutput);
                        } else {
                            reject(new InsightError());
                        }
                    } catch (e) {
                        reject(new InsightError());
                    }
                });
            }).on("error", (e) => {
                reject(new InsightError());
            });
        });
    }
}
