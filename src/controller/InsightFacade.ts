import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {rejects} from "assert";
import {isBoolean, isUndefined} from "util";
import validate = WebAssembly.validate;
import JSZip = require("jszip");
import {JSZipObject} from "jszip";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let validFile: boolean;
let fs = require("fs");
let numRows: number = 0;
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
    // data Structures
    public myDatasetMap: Map<string, CourseSection[]>;  // {("id", [CourseSectio1, CourseSectio2, CourseSectio3]); ...}
    public dataSetsMap: Map<string, InsightDataset>; //  {("id", InsightDataset); ....}
    public dataSetsIDs: string[];   // { "" ; ""; "" }
    constructor() {
        this.myDatasetMap = new Map<string, CourseSection[]>();
        this.dataSetsMap = new Map<string, InsightDataset>();
        this.dataSetsIDs = [];
        Log.trace("InsightFacadeImpl::init()");

    }
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this;
        let finalSectionsArr: CourseSection[];
        numRows = 0;
        let promiseCoursesFiles: any[] = [];
        return new Promise(function (resolve, reject) {
            if (self.badDatasetID(id) || self.badContent(content) || self.dataSetsIDs.includes(id)) {
                return reject(new InsightError("Invalid Input or existed dataset"));
            } else {
                try {
                    let zip = new JSZip();
                    // UNzip
                    zip.loadAsync(content, {base64: true}).then( (AllFiles) => {
                        AllFiles.forEach(function (relativePath: string, file) {
                            validFile = this.validCoursesFile(relativePath, file);
                            if (validFile) {
                                let aNewCourse = file.async("text").then(function (CourseJasonData: string) {
                                    let currCourseSectionArr: CourseSection[] = [];
                                    currCourseSectionArr = self.makePreSavedSections(CourseJasonData);
                                    if (CourseJasonData.length !== 0) {
                                        finalSectionsArr = finalSectionsArr.concat(currCourseSectionArr);
                                    }
                                });
                                promiseCoursesFiles.push(aNewCourse);
                            }
                        });
                        Promise.all(promiseCoursesFiles).then(function () {
                            try {
                                if (finalSectionsArr.length === 0) {
                                    return reject(new InsightError("no valid sections"));
                                }
                                self.dataSetsIDs.push(id);
                                self.dataSetsMap.set(id, self.makeNewDataset(id, kind, finalSectionsArr.length));
                                self.myDatasetMap.set(id, finalSectionsArr);
                                let path = "./data/" + id + ".json";
                                fs.writeFileSync(path, JSON.stringify(finalSectionsArr), "utf-8");
                                resolve(self.dataSetsIDs);
                            } catch (e) {
                                return reject(new InsightError("promise all error"));
                            }
                        });
                    }).catch(function (e) {
                        return reject(new InsightError("unzip process failed!")); // catch unzip errors
                    });
                    //
                } catch (err) {
                    return reject(new InsightError("promise all error"));
             }
            }
        });
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
    // Helper functions
    //
    // 1 -check input DatasetID
    public badDatasetID (id: string): boolean {
        if (id === null || id === undefined || id === "" || id.includes("_") || id.includes(" ")) { // ??? type of
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }
    // 2 -check input content
    public badContent(content: string): boolean {
        if (content === null || content === undefined) {
            return true;    // return true if the id is null or undefined
        } else {
            return false;
        }
    }
    // 3 -check valid file under "courses" directory
    //   use helper 4 /check true if no subfolder, false then has sub_folder
    public validCoursesFile (relativePath: string, file: JSZipObject): boolean {
        if ((relativePath.indexOf("courses/") === 0) && (relativePath.indexOf("courses/") !== -1) // "courses/" is root
            && (file.dir === false)) {  // "the tail of this file  is not a folder"
            if (this.countFolder(relativePath) === 1) {
                return true;    // true if no subfolder,
            } else {
                return false;    // false then has sub_folder
            }
        }
    }
    // 4 - count folders(dir)
    public  countFolder (relativePath: string): number {
        let count: number = (relativePath.match(/[/]/g) || []).length;
        return count;
    }
    // 5 - save the current jsonObj(file-course) to data structure.
    public makePreSavedSections(CourseJasonData: string): CourseSection[] {
        let currSections: CourseSection[] = [];
        try {
            let unstoredParsedCourseData = JSON.parse(CourseJasonData);
            let validunstoredParsedCourseData: boolean = unstoredParsedCourseData.result[0]; // ???
            if (validunstoredParsedCourseData) {
                for (let oneSection of unstoredParsedCourseData.result) {
                    if (this.validSection(oneSection)) {
                        currSections.push(this.makeCorseSection(oneSection));
                        numRows ++;
                    }
                }
            }
        } catch (e) {
            // error occurs when parsing jason
        }
        return currSections;
    }
    // 6 - check if the section is valid
    public validSection(section: any) {
        return ((typeof (section.Subject) !== "undefined") && (typeof (section.Course) !== "undefined") &&
            (typeof (section.Avg) !== "undefined") && (typeof (section.Professor) !== "undefined")
            && (typeof (section.Title) !== "undefined") && (typeof (section.Pass) !== "undefined")
            && (typeof (section.Fail) !== "undefined") && (typeof (section.Audit)  !== "undefined")
            && (typeof (section.id) !== "undefined") && (typeof (section.Year) !== "undefined"));
            // && (typeof (section.Subject) === "string" ) && (typeof (section.Course) === "string")
            // && (typeof (section.Avg) === "number") && (typeof (section.Professor) === "string")
            // && (typeof (section.Title) === "string") && (typeof (section.Pass) === "number")
            // && (typeof (section.Fail) === "number") && (typeof section.Audit === "number")
            // && (typeof (section.id) === "number") && (typeof section.Section === "number"));
    }
    // 7 - make a new course section
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
            courses_year: section.Year.toNumber(),
        };
        if (section.Section === "overall") {
            tempSection. courses_year = 1990;
        }
        return tempSection;
    }
    // 8
    public setUUID (id: any) {
        return id.toString();
    }
    // 9 make new dataset
    public  makeNewDataset (id: string, kind: InsightDatasetKind, length: number): InsightDataset {
        let newDataset = {
            id : id,
            kind : kind,
            numRows : length,
        };
        return newDataset;
        }


    // check input InsightDataset Kind // ??? check or not
    // public badKind(kind: InsightDatasetKind): boolean {
    //     if (kind === null || kind === undefined) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
}

