# Simple-Data-Engineering
# The code is in master branch
Using Javascript and Typescript to realize: taking Json files from zips and trasforming data from Json files into Queries. Using Typescript to oprate data with NoSQL.
The code is in master branch

# Query is an object which is similar to SQL language. The query has these features:
WHERE (transformation):
1. simple statement. for numerical elements: GT(greater than)/EQ(equal)/LT(less than) + target(feature_name+number)
for categorical elements: “IS” + target(feature_name+string(“*ab*”))
 2. Logical delarance: OR, AND, NOT,
OPTIONS: selected factors names (names the user want to see)
ORDER: sort the result in given order
GROUPBY: group the result by some factors
APPLY: apply max/min/count/sum/average in data

# There are 3 parts in this project: 
* 1. Getting information from json files (multiple json files are in the zips), store it in datasets. 
* 2. Use logics(No SQL) to analyze (filter/group/sort) data in Typescript locally.
* 3. Writing code to build a ‘front table’ which users can access easily, users just need to insert numbers and boxes, choose what they want from drop-down boxes. Also translate requirements from the ‘front table’ into queries and upload the expected result into the page.
