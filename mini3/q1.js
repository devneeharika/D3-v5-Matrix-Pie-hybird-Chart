let svg;
let maxVal = -Infinity;
let top10Recipients = [];
let top20Donors = [];

let highColor = "#313695";
let midColor = "#4575b4";
let lowColor = "#e0f3f8";

let margin = {top: 10, right: 30, bottom: 70, left: 120},
    width = 700 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


function q1Visualization(rawData) {
    extractTopCountries(rawData);
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


    let donateMap = accumulateToDonorReceiverMap(rawData);
    let donateList = expand2LayerMapToArray(donateMap);
    donateList = donateList.sort(
        function (a, b) {
            let keyA = a.amount;
            let keyB = b.amount;
            // Compare the 2 dates
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
        }
    );
    console.log(donateList);
    maxVal = donateList[0].amount;


    let colorInterpreter = d3.scaleLinear()
        .range([
            lowColor,
            midColor,
            highColor
        ])
        .domain([0, maxVal/8, maxVal]);

    renderLegend();


    svg.selectAll().data(donateList,
        function (d) {
            if (d !== undefined) {
                return d.recipient + ":" + d.donor
            }
        })
        .enter()
        .append("rect")
        .attr("x",
            function (d) {
                return x(d.recipient)
            })
        .attr("y",
            function (d) {
                return y(d.donor)
            })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) {
            return colorInterpreter(d.amount)
        })


}

function svgConfig() {
    svg = d3.select("#q1")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
}

function renderLegend() {
    let w = 700, h = 30;
    let key = d3.select("#q1l")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "legend");
    let gradientId = "gradient1";
    let legend = key.append("defs")
        .append("svg:linearGradient")
        .attr("id", gradientId)
        .attr("y1", "100%")
        .attr("x1", "0%")
        .attr("y2", "100%")
        .attr("x2", "100%")
        .attr("spreadMethod", "pad");
    legend.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", lowColor)
        .attr("stop-opacity", 1);
    legend.append("stop")
        .attr("offset", "12.5%")
        .attr("stop-color", midColor)
        .attr("stop-opacity", 1);
    legend.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", highColor)
        .attr("stop-opacity", 1);
    key.append("rect")
        .attr("width", w)
        .attr("height", h)
        .style("fill", "url(#gradient1)")
        .attr("transform", "translate(" + margin.left + ",10)");
    let y = d3.scaleLinear()
        .range([0, w])
        .domain([0, maxVal]);
    let yAxis = d3.axisBottom(y).ticks(null, "s");
    key.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + margin.left + ",10)")
        .call(yAxis)
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
            singleton['amount'] = innerMap[recipient];
            res.push(singleton);
        }
    }
    return res;
}

function accumulateToDonorReceiverMap(data) {
    let bigMap = new Map();
    for (let i = 0; i < data.length; i++) {
        let row = data[i];
        let donor = row.donor;
        let recipient = row.recipient;
        if (top20Donors.includes(donor) && top10Recipients.includes(recipient)) {
            let amount = parseInt(row.commitment_amount_usd_constant);
            if (bigMap[donor] === undefined) {
                bigMap[donor] = new Map();
            }
            if (bigMap[donor][recipient] === undefined) {
                bigMap[donor][recipient] = 0;
            }
            bigMap[donor][recipient] = bigMap[donor][recipient] + amount;
        }

    }
    return bigMap;
}