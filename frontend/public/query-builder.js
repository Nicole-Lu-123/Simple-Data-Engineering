/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

CampusExplorer.buildQuery = function () {
    let query = {};
    // TODO: implement!
    query["WHERE"] = this.getBody();
    query["OPTIONS"] = this.getOptions();
    query["TRANSFORMATIONS"] = this.getTrans();
    console.log("CampusExplorer.buildQuery not implemented yet.");
    return query;
};
function getBody() {
    let body = {};
    if(document.getElementById("courses-conditiontype-all").checked) {
        body["AND"] = this.filterList();
    } else if(document.getElementById("courses-conditiontype-any").checked) {
        body["OR"] = this.filterList();
    } else if(document.getElementById("courses-conditiontype-none").checked) {
        body["NOT"] = this.filterList();
    }
}

function filterList() {
    let list = document.getElementsByClassName("conditions-container")[0].getElementsByClassName("control fields")[0].getElementsByTagName("select")[0];
    let length = list.length;
    for (i = 0; i < length; i++) {

    }
}
