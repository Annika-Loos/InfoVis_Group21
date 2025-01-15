document.addEventListener('DOMContentLoaded', () => {
    let dataset = [];

    // Load CSV and initialize filters
    d3.csv("data/data.csv").then(data => {
        // Ensure startdate (year) is numeric
        data.forEach(d => d.startdate = +d.startdate);

        dataset = data;
        console.log("Raw Data:", dataset);

        // Nationality filter
        const nationalities = Array.from(new Set(dataset.map(d => d.nationality))).sort();
        const nationalityDropdown = d3.select("#nationality");
        nationalityDropdown.append("option").text("All").attr("value", "All");
        nationalities.forEach(nationality => {
            nationalityDropdown.append("option").text(nationality).attr("value", nationality);
        });

        // Gender filter
        const genders = ["All", "Male", "Female"];
        const genderDropdown = d3.select("#gender");
        genders.forEach(gender => {
            genderDropdown.append("option").text(gender).attr("value", gender);
        });

        // Status filter
        const statuses = ["All", "Alive", "Dead"];
        const statusDropdown = d3.select("#status");
        statuses.forEach(status => {
            statusDropdown.append("option").text(status).attr("value", status);
        });

        // Attach filter functionality to the button
        document.getElementById("applyFilters").addEventListener("click", () => {
            const selectedNationality = document.getElementById("nationality").value;
            const selectedStatus = document.getElementById("status").value;
            const selectedGender = document.getElementById("gender").value;
            const selectedAge = document.getElementById("age").value;

            // Filter data based on selections
            let filteredData = dataset;

            if (selectedNationality !== "All") {
                filteredData = filteredData.filter(d => d.nationality === selectedNationality);
            }

            if (selectedStatus !== "All") {
                filteredData = filteredData.filter(d => d.status_at_exhibition === selectedStatus);
            }

            if (selectedGender !== "All") {
                filteredData = filteredData.filter(d => d.gender === selectedGender);
            }

            filteredData = filteredData.filter(d => d.age_at_exhibition <= selectedAge);

            console.log("Filtered Data:", filteredData);

        
            updateVisualization(filteredData);

        
            updateStats(filteredData);
        });
    }).catch(error => {
        console.error("Error loading data:", error); 
    });

    // Function to update visualization (scatter plot)
    function updateVisualization(data) {
        console.log("Filtered Data for Visualization:", data);

        // Clear the existing visualization
        d3.select("#visualization").html("");

        if (data.length === 0) {
            d3.select("#visualization").append("p").text("No data matches the selected criteria.");
            return;
        }

        // Aggregate data to find top 10 artists
        const artistCounts = d3.rollups(
            data,
            v => v.length,
            d => d.firstname + " " + d.lastname // Use full name for artists
        ).sort((a, b) => d3.descending(a[1], b[1]))
         .slice(0, 10);

        const artists = artistCounts.map(d => d[0]);
        const filteredData = data.filter(d => artists.includes(d.firstname + " " + d.lastname));

        console.log("Top 10 Artists:", artistCounts);

        // Group by Artist and Year (startdate)
        const artistYearData = d3.group(
            filteredData,
            d => d.firstname + " " + d.lastname,
            d => d.startdate
        );

        // Scatter plot setup
        const margin = { top: 20, right: 30, bottom: 50, left: 150 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.startdate))
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(artists)
            .range([0, height])
            .padding(0.1);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(artists);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Draw scatter points
        artistYearData.forEach((years, artist) => {
            years.forEach((records, year) => {
                const paintingCount = records.reduce((sum, row) => sum + (+row.paintings || 0), 0);
                const elementID = artist.split(" ").slice(-1) + year;
                svg.append("circle")
                    .attr("cx", x(year))
                    .attr("cy", y(artist) + y.bandwidth() / 2)
                    .attr("r", 5)
                    .attr("fill", colorScale(artist))
                    .attr("id", elementID)
                    .append("title")
                    .text(`${artist}, ${year}: ${records.length} exhibitions, ${paintingCount} paintings`)

                // make each data point a button
                svg.select("#" + elementID)
                    .on("click", function() {
                        updateBar(artist, year, records);
                    });
                });
        });
    }

    // Function to update statistics
    function updateStats(data) {
        const paintingCount = data.reduce((sum, row) => sum + (+row.paintings || 0), 0);
        const countryCount = new Set(data.map(d => d.country)).size;
        const cityCount = new Set(data.map(d => d.city)).size;
        const exhibitionCount = new Set(data.map(d => d.eid)).size;

        document.getElementById("paintingCount").textContent = paintingCount;
        document.getElementById("countryCount").textContent = countryCount;
        document.getElementById("cityCount").textContent = cityCount;
        document.getElementById("exhibitionCount").textContent = exhibitionCount;
    }

    // Function to update bar chart
    function updateBar(artist, year, records) {
        // Clear the existing visualization
        d3.select("#visualization_bar").html("");

        document.getElementById("barTitle").textContent = artist + " (" + year + ")";

        // initialization
        const margin = { top: 20, right: 150, bottom: 50, left: 150 };
        const width = 800 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        // Preprocess data
        const parsed = d3.rollups(records, v => v.length, d => d.country);
        const countries = parsed.map(d => d[0]);
        const exhibitions = parsed.map(d => d[1]);

        const svg = d3.select("#visualization_bar")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleBand()
                .domain(countries)
                .range([0, width])
                .padding(0.1);

        const y = d3.scaleLinear()
                .domain([0, d3.max(exhibitions)])
                .range([height, 0]);
            //    .padding(0.1);

        const yAxisTicks = y.ticks()
            .filter(tick => Number.isInteger(tick));
        const yAxis = d3.axisLeft(y)
            .tickValues(yAxisTicks)
            .tickFormat(d3.format('d'));

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Create bars
        svg.selectAll(".bar")
            .data(parsed)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d[0]))
            .attr("y", d => y(d[1]))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d[1]))
            .attr("fill", "steelblue");
    }
});