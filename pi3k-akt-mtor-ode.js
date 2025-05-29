// PI3K-Akt-mTOR Signaling Network ODE Visualization
// This script creates an interactive visualization of oscillations in the PI3K-Akt-mTOR pathway

class SignalingNetworkODE {
  constructor(containerId, width = 700, height = 450) {
    this.containerId = containerId;
    this.width = width;
    this.height = height;
    this.margin = { top: 20, right: 20, bottom: 50, left: 50 };
    
    // Parameters for simulation
    this.playing = false;
    this.currentTime = 0;
    this.maxTime = 30;
    this.timeStep = 0.05;
    this.timeoutId = null;
    
    // Define network structure
    this.nodes = [
      { id: 0, name: "RTK", x: 100, y: 200, radius: 25, value: 0.9, color: "#1f77b4", 
        description: "Receptor Tyrosine Kinase - activated by growth factors" },
      { id: 1, name: "PI3K", x: 200, y: 160, radius: 25, value: 0.1, color: "#ff7f0e", 
        description: "Phosphoinositide 3-kinase - converts PIP2 to PIP3" },
      { id: 2, name: "PTEN", x: 200, y: 240, radius: 25, value: 0.7, color: "#2ca02c", 
        description: "Phosphatase and tensin homolog - converts PIP3 back to PIP2" },
      { id: 3, name: "Akt", x: 300, y: 160, radius: 25, value: 0.1, color: "#d62728", 
        description: "Protein Kinase B - activates mTORC1 and is activated by mTORC2" },
      { id: 4, name: "mTORC1", x: 400, y: 160, radius: 25, value: 0.1, color: "#9467bd", 
        description: "Mammalian target of rapamycin complex 1 - activated by Akt" },
      { id: 5, name: "mTORC2", x: 300, y: 80, radius: 25, value: 0.5, color: "#8c564b", 
        description: "Mammalian target of rapamycin complex 2 - activates Akt" },
      { id: 6, name: "S6K", x: 500, y: 160, radius: 25, value: 0.1, color: "#e377c2", 
        description: "Ribosomal protein S6 kinase - activated by mTORC1" },
      { id: 7, name: "IRS1", x: 150, y: 120, radius: 25, value: 0.8, color: "#7f7f7f", 
        description: "Insulin receptor substrate 1 - mediates RTK signaling to PI3K" },
    ];
    
    // Define interactions
    this.links = [
      // Activation links
      { source: 0, target: 7, weight: 0.6, type: "activation" },   // RTK activates IRS1
      { source: 7, target: 1, weight: 0.7, type: "activation" },   // IRS1 activates PI3K
      { source: 1, target: 3, weight: 0.6, type: "activation" },   // PI3K activates Akt
      { source: 3, target: 4, weight: 0.7, type: "activation" },   // Akt activates mTORC1
      { source: 4, target: 6, weight: 0.8, type: "activation" },   // mTORC1 activates S6K
      { source: 5, target: 3, weight: 0.6, type: "activation" },   // mTORC2 activates Akt
      
      // Inhibition links
      { source: 2, target: 3, weight: 0.5, type: "inhibition" },   // PTEN inhibits Akt pathway
      { source: 6, target: 7, weight: 0.6, type: "inhibition" },   // S6K inhibits IRS1 (negative feedback)
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
      .text("Activation Level");
    
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
      .attr("transform", (d, i) => `translate(0, ${i * 15})`);
    
    legendItems.append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", d => d.color);
    
    legendItems.append("text")
      .attr("x", 15)
      .attr("y", 9)
      .attr("font-size", "10px")
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
    
    // Add tooltips
    this.tooltip = d3.select(`#${this.containerId}`)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("transition", "opacity 0.2s");
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
      .attr("stroke", d => d.type === "activation" ? "#999" : "#f55")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, d.weight * 5))
      .attr("stroke-dasharray", d => d.type === "inhibition" ? "5,5" : "none");
    
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
      .on("mouseover", (event, d) => {
        this.highlightNode(d.id);
        
        // Show tooltip
        this.tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .style("opacity", 1)
          .html(`<strong>${d.name}</strong><br>${d.description}<br>Current value: ${d.value.toFixed(2)}`);
      })
      .on("mouseout", () => {
        this.unhighlightNodes();
        
        // Hide tooltip
        this.tooltip.style("opacity", 0);
      });
    
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
    
    // Find connected links
    const connectedLinks = this.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // Highlight connected links
    this.linkGroup.selectAll(".link")
      .attr("stroke", d => {
        if (d.source === nodeId || d.target === nodeId) {
          return d.type === "activation" ? "#666" : "#f00";
        }
        return d.type === "activation" ? "#999" : "#f55";
      })
      .attr("stroke-opacity", d => d.source === nodeId || d.target === nodeId ? 1 : 0.6)
      .attr("stroke-width", d => {
        if (d.source === nodeId || d.target === nodeId) {
          return Math.max(2, d.weight * 5);
        }
        return Math.max(1, d.weight * 5);
      });
    
    // Highlight connected nodes
    const connectedNodeIds = new Set();
    connectedLinks.forEach(link => {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    });
    
    // Highlight path in the plot
    this.nodePaths
      .attr("stroke-width", (d, i) => i === nodeId ? 4 : (connectedNodeIds.has(i) ? 3 : 2))
      .attr("stroke-opacity", (d, i) => i === nodeId ? 1 : (connectedNodeIds.has(i) ? 0.8 : 0.5));
  }
  
  unhighlightNodes() {
    // Reset node styles
    this.nodeGroup.selectAll(".node")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
    
    // Reset link styles
    this.linkGroup.selectAll(".link")
      .attr("stroke", d => d.type === "activation" ? "#999" : "#f55")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.max(1, d.weight * 5));
    
    // Reset path styles
    this.nodePaths
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 1);
  }
  
  // Simulates ODE dynamics for PI3K-Akt-mTOR network
  simulateStep() {
    // Constants for the dynamics
    const ACTIVATION_RATE = 0.1;
    const DEACTIVATION_RATE = 0.03;
    const BASELINE = 0.01;
    
    // Get current values
    const rtk = this.nodes[0].value;
    const pi3k = this.nodes[1].value;
    const pten = this.nodes[2].value;
    const akt = this.nodes[3].value;
    const mtorc1 = this.nodes[4].value;
    const mtorc2 = this.nodes[5].value;
    const s6k = this.nodes[6].value;
    const irs1 = this.nodes[7].value;
    
    // Calculate new values based on simplified ODE model
    const newValues = [];
    
    // RTK dynamics - oscillates based on external stimulus (for demonstration)
    newValues[0] = rtk + this.timeStep * (BASELINE + 0.2 * Math.sin(this.currentTime * 0.2) - DEACTIVATION_RATE * rtk);
    
    // IRS1 dynamics - activated by RTK, inhibited by S6K (negative feedback)
    newValues[7] = irs1 + this.timeStep * (ACTIVATION_RATE * rtk * (1 - irs1) - ACTIVATION_RATE * s6k * irs1 - DEACTIVATION_RATE * irs1);
    
    // PI3K dynamics - activated by IRS1
    newValues[1] = pi3k + this.timeStep * (ACTIVATION_RATE * irs1 * (1 - pi3k) - DEACTIVATION_RATE * pi3k);
    
    // PTEN dynamics - fairly constant (slightly oscillating for visual effect)
    newValues[2] = pten + this.timeStep * (BASELINE + 0.05 * Math.sin(this.currentTime * 0.1) - DEACTIVATION_RATE * (pten - 0.6));
    
    // Akt dynamics - activated by PI3K and mTORC2, inhibited by PTEN
    newValues[3] = akt + this.timeStep * (
      ACTIVATION_RATE * pi3k * (1 - akt) + 
      ACTIVATION_RATE * mtorc2 * (1 - akt) - 
      ACTIVATION_RATE * pten * akt - 
      DEACTIVATION_RATE * akt
    );
    
    // mTORC1 dynamics - activated by Akt
    newValues[4] = mtorc1 + this.timeStep * (ACTIVATION_RATE * akt * (1 - mtorc1) - DEACTIVATION_RATE * mtorc1);
    
    // mTORC2 dynamics - indirectly influenced by PI3K (simplified)
    newValues[5] = mtorc2 + this.timeStep * (ACTIVATION_RATE * pi3k * (1 - mtorc2) - DEACTIVATION_RATE * mtorc2);
    
    // S6K dynamics - activated by mTORC1
    newValues[6] = s6k + this.timeStep * (ACTIVATION_RATE * mtorc1 * (1 - s6k) - DEACTIVATION_RATE * s6k);
    
    // Apply value boundaries (0-1) and update node values
    this.nodes.forEach((node, i) => {
      node.value = Math.max(0, Math.min(1, newValues[i]));
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
    
    // Reset time
    this.currentTime = 0;
    
    // Reset node values to initial states
    this.nodes[0].value = 0.9;  // RTK
    this.nodes[1].value = 0.1;  // PI3K
    this.nodes[2].value = 0.7;  // PTEN
    this.nodes[3].value = 0.1;  // Akt
    this.nodes[4].value = 0.1;  // mTORC1
    this.nodes[5].value = 0.5;  // mTORC2
    this.nodes[6].value = 0.1;  // S6K
    this.nodes[7].value = 0.8;  // IRS1
    
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
  const container = document.getElementById("pi3k-akt-mtor-visualization");
  if (container) {
    const vis = new SignalingNetworkODE("pi3k-akt-mtor-visualization");
  }
  
  // Add explanatory text toggle functionality
  const explanationButton = document.getElementById("toggle-pathway-explanation");
  const explanationText = document.getElementById("pathway-visualization-explanation");
  
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