// Graph ODE Visualization
// This script creates an interactive visualization of continuous message passing in Graph ODEs

class GraphODEVisualization {
  constructor(containerId, width = 700, height = 400) {
    this.containerId = containerId;
    this.width = width;
    this.height = height;
    this.margin = { top: 20, right: 20, bottom: 50, left: 50 };
    
    // Parameters for simulation
    this.playing = false;
    this.currentTime = 0;
    this.maxTime = 10;
    this.timeStep = 0.05;
    this.timeoutId = null;
    
    // Define graph structure
    this.nodes = [
      { id: 0, name: "A", x: 200, y: 200, radius: 25, value: 1.0, color: "#1f77b4" },
      { id: 1, name: "B", x: 350, y: 150, radius: 25, value: 0.0, color: "#ff7f0e" },
      { id: 2, name: "C", x: 350, y: 250, radius: 25, value: 0.0, color: "#2ca02c" },
      { id: 3, name: "D", x: 500, y: 200, radius: 25, value: 0.0, color: "#d62728" },
      { id: 4, name: "E", x: 275, y: 100, radius: 25, value: 0.0, color: "#9467bd" },
      { id: 5, name: "F", x: 275, y: 300, radius: 25, value: 0.0, color: "#8c564b" },
    ];
    
    this.links = [
      { source: 0, target: 1, weight: 0.5 },
      { source: 0, target: 2, weight: 0.3 },
      { source: 1, target: 3, weight: 0.7 },
      { source: 2, target: 3, weight: 0.4 },
      { source: 0, target: 4, weight: 0.2 },
      { source: 0, target: 5, weight: 0.2 },
    ];
    
    // Store node value history for plotting
    this.nodeHistory = this.nodes.map(() => []);
    this.timePoints = [];
    
    // Initialize the visualization
    this.init();
  }
  
  init() {
    // Create main SVG container
    this.svg = d3.select(`#${this.containerId}`)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("style", "max-width: 100%; height: auto;");
    
    // Create groups for different elements
    this.linkGroup = this.svg.append("g").attr("class", "links");
    this.nodeGroup = this.svg.append("g").attr("class", "nodes");
    this.labelGroup = this.svg.append("g").attr("class", "labels");
    
    // Create timeseries plot area
    this.plotWidth = this.width - this.margin.left - this.margin.right;
    this.plotHeight = 120;
    this.plotArea = this.svg.append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.height - this.margin.bottom - this.plotHeight})`)
      .attr("class", "plot-area");
    
    // X and Y scales for the plot
    this.xScale = d3.scaleLinear()
      .domain([0, this.maxTime])
      .range([0, this.plotWidth]);
    
    this.yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([this.plotHeight, 0]);
    
    // Add axes
    this.plotArea.append("g")
      .attr("transform", `translate(0, ${this.plotHeight})`)
      .attr("class", "x-axis")
      .call(d3.axisBottom(this.xScale).ticks(5));
    
    this.plotArea.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(this.yScale).ticks(5));
    
    // Add axis labels
    this.plotArea.append("text")
      .attr("x", this.plotWidth / 2)
      .attr("y", this.plotHeight + 35)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Time");
    
    this.plotArea.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -this.plotHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Node Value");
    
    // Line generator for the timeseries
    this.line = d3.line()
      .x((d, i) => this.xScale(this.timePoints[i]))
      .y(d => this.yScale(d))
      .curve(d3.curveBasis);
    
    // Initialize the lines
    this.nodePaths = this.plotArea.selectAll(".node-path")
      .data(this.nodeHistory)
      .enter()
      .append("path")
      .attr("class", "node-path")
      .attr("fill", "none")
      .attr("stroke", (d, i) => this.nodes[i].color)
      .attr("stroke-width", 2);
    
    // Add legend for the plot
    const legend = this.plotArea.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.plotWidth - 80}, 10)`);
    
    const legendItems = legend.selectAll(".legend-item")
      .data(this.nodes)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    
    legendItems.append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", d => d.color);
    
    legendItems.append("text")
      .attr("x", 15)
      .attr("y", 9)
      .attr("font-size", "12px")
      .text(d => d.name);
    
    // Add control buttons
    const controlsContainer = d3.select(`#${this.containerId}`)
      .append("div")
      .attr("class", "controls")
      .style("text-align", "center")
      .style("margin-top", "10px");
    
    this.playButton = controlsContainer.append("button")
      .attr("class", "play-button")
      .text("Play")
      .on("click", () => this.togglePlay());
    
    this.resetButton = controlsContainer.append("button")
      .attr("class", "reset-button")
      .text("Reset")
      .on("click", () => this.reset())
      .style("margin-left", "10px");
    
    // Render initial state
    this.updateTimeseriesPlot();
    this.render();
  }
  
  render() {
    // Draw the links
    const links = this.linkGroup.selectAll(".link")
      .data(this.links)
      .join("line")
      .attr("class", "link")
      .attr("x1", d => this.nodes[d.source].x)
      .attr("y1", d => this.nodes[d.source].y)
      .attr("x2", d => this.nodes[d.target].x)
      .attr("y2", d => this.nodes[d.target].y)
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, d.weight * 5));
    
    // Draw the nodes
    const nodes = this.nodeGroup.selectAll(".node")
      .data(this.nodes)
      .join("circle")
      .attr("class", "node")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("fill-opacity", d => 0.3 + 0.7 * d.value)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .on("mouseover", (event, d) => this.highlightNode(d.id))
      .on("mouseout", () => this.unhighlightNodes());
    
    // Add node labels
    const labels = this.labelGroup.selectAll(".node-label")
      .data(this.nodes)
      .join("text")
      .attr("class", "node-label")
      .attr("x", d => d.x)
      .attr("y", d => d.y + 5)
      .attr("text-anchor", "middle")
      .attr("font-family", "sans-serif")
      .attr("font-size", "14px")
      .attr("fill", "white")
      .text(d => d.name);
    
    // Add value labels
    const valueLabels = this.labelGroup.selectAll(".value-label")
      .data(this.nodes)
      .join("text")
      .attr("class", "value-label")
      .attr("x", d => d.x)
      .attr("y", d => d.y - d.radius - 10)
      .attr("text-anchor", "middle")
      .attr("font-family", "sans-serif")
      .attr("font-size", "12px")
      .attr("fill", d => d.color)
      .text(d => d.value.toFixed(2));
  }
  
  highlightNode(nodeId) {
    // Highlight the selected node
    this.nodeGroup.selectAll(".node")
      .attr("stroke", d => d.id === nodeId ? d.color : "#fff")
      .attr("stroke-width", d => d.id === nodeId ? 3 : 1.5);
    
    // Highlight connected links
    this.linkGroup.selectAll(".link")
      .attr("stroke", d => d.source === nodeId || d.target === nodeId ? "#666" : "#999")
      .attr("stroke-opacity", d => d.source === nodeId || d.target === nodeId ? 1 : 0.6)
      .attr("stroke-width", d => {
        if (d.source === nodeId || d.target === nodeId) {
          return Math.max(2, d.weight * 5);
        }
        return Math.max(1, d.weight * 5);
      });
    
    // Highlight path in the plot
    this.nodePaths
      .attr("stroke-width", (d, i) => i === nodeId ? 4 : 2)
      .attr("stroke-opacity", (d, i) => i === nodeId ? 1 : 0.5);
  }
  
  unhighlightNodes() {
    // Reset node styles
    this.nodeGroup.selectAll(".node")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
    
    // Reset link styles
    this.linkGroup.selectAll(".link")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, d.weight * 5));
    
    // Reset path styles
    this.nodePaths
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 1);
  }
  
  // Simulates ODE dynamics - replace with your own Graph ODE model
  simulateStep() {
    // Simple diffusion model for demonstration
    const newValues = this.nodes.map(node => node.value);
    
    for (const link of this.links) {
      const sourceNode = this.nodes[link.source];
      const targetNode = this.nodes[link.target];
      
      // Compute flow based on value difference and link weight
      const flow = link.weight * (sourceNode.value - targetNode.value) * this.timeStep;
      
      // Update values (ensure they stay in [0,1] range)
      newValues[link.source] = Math.max(0, Math.min(1, newValues[link.source] - flow));
      newValues[link.target] = Math.max(0, Math.min(1, newValues[link.target] + flow));
    }
    
    // Update node values
    this.nodes.forEach((node, i) => {
      node.value = newValues[i];
    });
    
    // Update time and history
    this.currentTime += this.timeStep;
    this.timePoints.push(this.currentTime);
    this.nodes.forEach((node, i) => {
      this.nodeHistory[i].push(node.value);
    });
    
    // Update visualization
    this.updateTimeseriesPlot();
    this.render();
    
    // Stop if we've reached the maximum time
    if (this.currentTime >= this.maxTime) {
      this.stopSimulation();
    }
  }
  
  updateTimeseriesPlot() {
    // Update x scale domain
    this.xScale.domain([0, Math.max(this.maxTime, this.currentTime)]);
    this.plotArea.select(".x-axis")
      .call(d3.axisBottom(this.xScale).ticks(5));
    
    // Update paths
    this.nodePaths
      .data(this.nodeHistory)
      .attr("d", d => this.line(d));
    
    // Add time indicator
    const timeIndicator = this.plotArea.selectAll(".time-indicator")
      .data([this.currentTime])
      .join("line")
      .attr("class", "time-indicator")
      .attr("x1", d => this.xScale(d))
      .attr("x2", d => this.xScale(d))
      .attr("y1", 0)
      .attr("y2", this.plotHeight)
      .attr("stroke", "black")
      .attr("stroke-dasharray", "4")
      .attr("stroke-width", 1);
  }
  
  togglePlay() {
    if (this.playing) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }
  
  startSimulation() {
    this.playing = true;
    this.playButton.text("Pause");
    
    const animate = () => {
      this.simulateStep();
      
      if (this.playing) {
        this.timeoutId = setTimeout(animate, 50);
      }
    };
    
    animate();
  }
  
  stopSimulation() {
    this.playing = false;
    this.playButton.text("Play");
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  reset() {
    // Stop any ongoing simulation
    this.stopSimulation();
    
    // Reset time and node values
    this.currentTime = 0;
    this.nodes[0].value = 1.0;
    for (let i = 1; i < this.nodes.length; i++) {
      this.nodes[i].value = 0.0;
    }
    
    // Clear history
    this.nodeHistory = this.nodes.map(() => []);
    this.timePoints = [];
    
    // Update visualization
    this.updateTimeseriesPlot();
    this.render();
  }
}

// Initialize visualization when the document is loaded
document.addEventListener("DOMContentLoaded", function() {
  // Create the visualization if the container exists
  const container = document.getElementById("graph-ode-visualization");
  if (container) {
    const vis = new GraphODEVisualization("graph-ode-visualization");
  }
  
  // Add explanatory text toggle functionality
  const explanationButton = document.getElementById("toggle-explanation");
  const explanationText = document.getElementById("visualization-explanation");
  
  if (explanationButton && explanationText) {
    explanationButton.addEventListener("click", function() {
      if (explanationText.style.display === "none") {
        explanationText.style.display = "block";
        explanationButton.textContent = "Hide Explanation";
      } else {
        explanationText.style.display = "none";
        explanationButton.textContent = "Show Explanation";
      }
    });
  }
}); 