let svg;
let top10Recipients = [];
let top20Donors = [];
let top5Purpose = [];
let top5PurposeCode = [];

let radius = 16;
let color = d3.scaleOrdinal()
    .range([
        "#e41a1c",
        "#377eb8",
        "#4daf4a",
        "#984ea3",
        "#ff7f00"
    ]);


function fromCodeToName(code) {
    if (code === undefined) {
        return "nope";
    }
    if (code.trim() === "") {
        return "";
    }
    for (let i = 0; i < top5PurposeCode.length; i++) {
        let cur = top5PurposeCode[i];
        if (cur.trim() === code.trim()) {
            return top5Purpose[i];
        }
    }
    return "";
}

let margin = {top: 10, right: 30, bottom: 100, left: 120},
    width = 700 - margin.left - margin.right,
    height = 770 - margin.top - margin.bottom;

function q1Visualization(rawData) {
    extractTopCountries(rawData);
    let purposeAggregation = groupByPurpose(rawData);
    for (let i = 0; i < 5; i++) {
        top5Purpose.push(purposeAggregation[i].purposeName);
        top5PurposeCode.push(purposeAggregation[i].purpose);
    }
    for (let i = 1; i < 6; i++) {
        let id = 'color'+i.toString()+'Label';
        let code = top5PurposeCode[i-1];
        document.getElementById(id).innerHTML = fromCodeToName(code);
    }

    svgConfig();

    // axis
    let x = d3.scaleBand()
        .range([0, width])
        .domain(top10Recipients)
        .padding(0.01);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
    svg.append("text")
        .attr("transform",
            "translate(" + (width/2) + " ," +
            (height + margin.top + 30) + ")")
        .style("text-anchor", "middle")
        .text("Recipients");

    let y = d3.scaleBand()
        .range([height, 0])
        .domain(top20Donors)
        .padding(0.01);
    svg.append("g")
        .call(d3.axisLeft(y));
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 30 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Donors");

    let donateMap = accumulateToDonorReceiverPurposeMap(rawData);
    let donateList = expand2LayerMapToArray(donateMap);
    console.log(donateList);

    // Pies
    for (let i = 0; i < donateList.length; i++) {
        let pair = donateList[i];
        let donor = pair.donor;
        let recipient = pair.recipient;
        let purposesData = pair.purposeAmt;
        let donorAxisPos = y(donor) + y.bandwidth() / 2;
        let recipientAxisPos = x(recipient) + x.bandwidth() / 2;

        // 画饼
        let arc = d3.arc()
            .outerRadius(radius)
            .innerRadius(0);
        let pie = d3.pie()
            .sort(null)
            .value(function (d) {
                return d;
            });
        let svgPie = svg.append('g')
            .attr("width", radius)
            .attr("height", radius)
            .append("g")
            .attr("transform", "translate(" + recipientAxisPos + "," + donorAxisPos + ")");

        let pieContentList = [];
        for (let j = 0; j < 5; j++) {
            let purposeCode = top5PurposeCode[j];
            if (purposesData[purposeCode] === undefined) {
                pieContentList.push(0)
            } else {
                pieContentList.push(purposesData[purposeCode]);
            }
        }

        let g = svgPie.selectAll(".arc")
            .data(pie(pieContentList))
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function (d) {
                return color(d.data);
            });

    }


}

function svgConfig() {
    svg = d3.select("#q1")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
}

function extractTopCountries(data) {
    let donateMap = new Map();
    let receiveMap = new Map();
    for (let i = 0; i < data.length; i++) {
        let row = data[i];
        let donor = row.donor;
        let recipient = row.recipient;
        let amount = parseInt(row.commitment_amount_usd_constant);
        if (donateMap[donor] === undefined) {
            donateMap[donor] = 0;
        }
        donateMap[donor] = donateMap[donor] + amount;

        if (receiveMap[recipient] === undefined) {
            receiveMap[recipient] = 0;
        }
        receiveMap[recipient] = receiveMap[recipient] + amount;
    }
    let donateList = mapToSortedArray(donateMap);
    let receiveList = mapToSortedArray(receiveMap);
    for (let i = 0; i < 10; i++) {
        top10Recipients.push(receiveList[9 - i]['country']);
    }
    for (let i = 0; i < 20; i++) {
        top20Donors.push(donateList[19 - i]['country']);
    }
}

function mapToSortedArray(map) {
    let res = [];
    for (let key in map) {
        let value = map[key];
        let item = new Map();
        item['country'] = key;
        item['amount'] = value;
        res.push(item);
    }
    res.sort(function (a, b) {
        let keyA = a.amount;
        let keyB = b.amount;
        // Compare the 2 dates
        if (keyA < keyB) return 1;
        if (keyA > keyB) return -1;
        return 0;
    });
    return res;
}

function expand2LayerMapToArray(map) {
    let res = [];
    for (let donor in map) {
        let innerMap = map[donor];
        for (let recipient in innerMap) {
            let singleton = new Map();
            singleton['donor'] = donor;
            singleton['recipient'] = recipient;
            singleton['purposeAmt'] = innerMap[recipient];
            res.push(singleton);
        }
    }
    return res;
}

function accumulateToDonorReceiverPurposeMap(data) {
    let bigMap = new Map();
    for (let i = 0; i < data.length; i++) {
        let row = data[i];
        let donor = row.donor;
        let recipient = row.recipient;
        let purpose = row.coalesced_purpose_code;
        if (top20Donors.includes(donor) && top10Recipients.includes(recipient)) {
            let amount = parseInt(row.commitment_amount_usd_constant);
            if (bigMap[donor] === undefined) {
                bigMap[donor] = new Map();
            }
            if (bigMap[donor][recipient] === undefined) {
                bigMap[donor][recipient] = new Map();
            }
            if (bigMap[donor][recipient][purpose] === undefined) {
                bigMap[donor][recipient][purpose] = 0;
            }
            bigMap[donor][recipient][purpose] = bigMap[donor][recipient][purpose] + amount;
        }

    }
    return bigMap;
}

function groupByPurpose(data) {
    let resultMap = new Map();
    for (let i = 0; i < data.length; i++) {
        let current = data[i];
        let purpose = current.coalesced_purpose_code;
        let amount = current.commitment_amount_usd_constant;
        let purposeName = current.coalesced_purpose_name;
        if (resultMap[purpose] === undefined) {
            let purposeSummary = new Map();
            purposeSummary['value'] = parseInt(amount);
            purposeSummary['purposeName'] = purposeName;
            resultMap[purpose] = purposeSummary;
        } else {
            let currentRes = resultMap[purpose]['value'] + parseInt(amount);
            resultMap[purpose]['value'] = currentRes;
        }
    }
    let result = [];
    for (let currentKey in resultMap) {
        let singleton = new Map();
        singleton['purpose'] = currentKey;
        singleton['value'] = resultMap[currentKey]['value'];
        singleton['purposeName'] = resultMap[currentKey]['purposeName'];
        result.push(singleton);
    }
    result.sort(function (a, b) {
        let keyA = a.value;
        let keyB = b.value;
        // Compare the 2 dates
        if (keyA < keyB) return 1;
        if (keyA > keyB) return -1;
        return 0;
    })

    return result;
}