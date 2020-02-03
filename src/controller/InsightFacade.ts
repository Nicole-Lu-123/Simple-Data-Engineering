import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {auditLogger} from "restify";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
const fs = require("fs");
// CourseSection Object
export interface CourseSection {
    courses_dept: string;
    courses_id: string;
    courses_avg: number;
    courses_instructor: string;
    courses_title: string;
    courses_pass: number;
    courses_fail: number;
    courses_audit: number;
    courses_uuid: string;
    courses_year: number;
}

export interface DatasetHashMap {
    [key: string]: InsightDataset;
}

export default class InsightFacade implements IInsightFacade {
    public datasetIDs: string[];
    public datasets: InsightDataset[];
    public datasetsMap: DatasetHashMap;
    public myDatasetMap: Map<string, CourseSection[]>;
    // public filteredDatasets: CourseSection[];
    constructor() {
        let self = this;
        self.datasetIDs = [];
        self.datasets = [];
        self.datasetsMap = {};
        self.myDatasetMap = new Map<string, CourseSection[]>();
        // self.filteredDatasets = [];
        Log.trace("InsightFacadeImpl::init()");
    }
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this;
        const coursesPromises: Array<Promise<string>> = [];
        let zip = new JSZip();
        // check the syntax of all input fields;
        if (self.badDatasetID(id) || self.badContent(content) || self.badKind(kind)) {
            return Promise.reject(new InsightError("Please check the ID, Content, or Kind! Potential invalid input."));
        }
        // check the existence of the input id
        if (this.existDatasetID(id)) {
            return Promise.reject(new InsightError("The Dataset has already exist"));
        }
        // start to addDataset
        return new Promise((resolve, reject) => {
                zip.loadAsync(content, {base64: true}).then(function (AllFiles) {
                    AllFiles.folder("courses").forEach(function (relativePath, file) {
                        // temperary section arrary
                        // check if has sub-folder
                        if (file.dir) {
                            return reject(new InsightError("Not supposed to have a subFoler!"));
                        }
                        coursesPromises.push(file.async("text"));
                    });
                    let tempSectionArr: CourseSection[] = [];
                    Promise.all(coursesPromises).then(function (FileCollection: any) {
                        for (const course of FileCollection) {
                            let sections = self.parseJson(course);
                            for (const section of sections.result) {
                                if (!this.validSection(section)) {
                                    continue;
                                } else {
                                    tempSectionArr.push(this.makeCorseSection(section));
                                }
                            }
                        }
                        if ((tempSectionArr !== null) && (typeof tempSectionArr !== undefined) &&
                            (tempSectionArr.length === 0)) {
                            return reject(new InsightError("None valid section. Not a valid dataset"));
                            }
                        let myNewDataset = self.makeDataset(tempSectionArr, id, kind);
                        self.datasetIDs.push(id);
                        self.datasets.push(myNewDataset);
                        self.datasetsMap[id] = myNewDataset;
                        self.myDatasetMap.set(id, tempSectionArr);
                        fs.writeFileSync("./data/" + id + ".json", JSON.stringify(tempSectionArr));
                        }
                        // parseAllValidSec (AllFiles, tempSectionArr, id, content, kind);
                    ).catch((error: any) => {
                        return reject (new InsightError("???"));
                    });
                }).catch((error: any) => {
                   return reject (new InsightError("somethings worng"));
                });
        }
        );
    }

    public removeDataset(id: string): Promise<string> {
        let self = this;
        if (self.badDatasetID(id)) {
            return Promise.reject("Please check the ID, Content, or Kind! Potential invalid input.");
        }
        if (this.existDatasetID(id) === false) {
            return Promise.reject(new NotFoundError());
        }
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let self = this;
        return Promise.resolve(self.datasets);
    }
    // Helper Functions
    // AddDataset Input validity checking -1
    public badDatasetID(id: string): boolean {
        return (id.length === 0 || id === undefined || id === null || id.includes("_") || id.includes(" "));
    }
    // AddDataset Input validity checking -2
    public badContent(content: string): boolean {
        if (content === null || content === undefined) {
            return true ;
        } else {
            return false;
        }
    }
    // AddDataset Input validity checking -3
    public badKind(kind: InsightDatasetKind): boolean {
        if (kind === null || kind === undefined) {
            return true;
        } else {
            return false;
        }
    }
    // Check whehere the id has existed
    public existDatasetID (id: string): boolean {
        if (fs.existsSync("./data/" + id)) { // ??? includes right or not
            return true;
        } else {
            return false;
        }
    }
    // Parse each course to a set of sectiosn
    public  parseJson (course: any) {
        let temparray: any;
        try {
            temparray = JSON.parse(course);
        } catch (e) {
            return;
        }
        return temparray;
    }
    public makeCorseSection(section: any): CourseSection {
        let tempSection: CourseSection = {
            courses_dept: section.Subject,
            courses_id: section.Course,
            courses_avg: section.Avg,
            courses_instructor: section.Professor,
            courses_title: section.Title,
            courses_pass: section.Pass,
            courses_fail: section.Fail,
            courses_audit: section.Audit,
            courses_uuid: this.setUUID(section.id),
            courses_year: this.setYear(section.Section)
        };
        return tempSection;

    }
    public setUUID (id: string) {
        return id.toString();
    }
    public setYear (section: any) {
        if (section === "overall") {
            return 1900;
        } else {
            return section;
        }
    }
    public validSection(section: any) {
        return ((section.Subject !== undefined) && (section.Course !== undefined) && (section.Avg !== undefined) &&
            (section.Professor !== undefined) && (section.Title !== undefined) && (section.Pass !== undefined) &&
            (section.Fail !== undefined) && (section.Audit !== undefined) && (section.id !== undefined) &&
            (section.Section !== undefined));
    }
    public  makeDataset ( tempSectionArr: CourseSection[], id: string, kind: InsightDatasetKind) {
        return  {
            id : id,
            kind: kind,
            numRows: tempSectionArr.length,
        };
    }
}
