class GanttChart {
    constructor() {
        this.chart = document.getElementById('chart');
        this.rectangles = [];
        this.rows = 1;
        this.selectedRectangle = null;
        this.dragData = null;
        this.gridSize = 20;
        this.sc2Data = null;
        this.timeScale = 3; // pixels per second
        
        this.init();
        this.createGridLines();
        this.createTimeIndex();
        this.loadSC2Data();
    }
    
    getIconPath(entityData, entityType) {
        // Use href field from JSON data if available, fallback to constructed path
        if (entityData.href) {
            return entityData.href;
        }
        
        // Fallback to constructed path for backwards compatibility
        const race = entityData.race || this.selectedRace || 'unknown';
        const name = entityData.name.toLowerCase().replace(/\s+/g, '_');
        const basePath = window.APP_BASE_PATH || '';
        return `${basePath}/assets/icons/${race}/${entityType}s/${name}.jpg`;
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    getBuildTime(entityData) {
        return entityData.build_time || entityData.research_time || 0;
    }
    
    getCost(entityData) {
        return {
            minerals: entityData.minerals || 0,
            gas: entityData.gas || 0
        };
    }
    
    createElement(tag, className, innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    addClickListener(selector, callback) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('click', callback);
        }
        return element;
    }
    
    createRowStatsHTML(endTime = 0, minerals = 0, gas = 0) {
        return `
            <div class="row-end-time">End: ${this.formatTime(endTime)}</div>
            <div class="row-total-cost">Cost: ${minerals}/${gas}</div>
        `;
    }
    
    createRowControlsHTML() {
        return `
            <button class="row-control-btn delete-row" title="Delete Row">❌</button>
            <button class="row-control-btn clear-row" title="Clear Row">🗑️</button>
            <button class="row-control-btn align-left" title="Align Left">⇤</button>
            <button class="row-control-btn align-right" title="Align with Row Above End">⇥</button>
        `;
    }
    
    getRowElement(rowIndex) {
        return this.chart.querySelector(`.row[data-row="${rowIndex}"]`);
    }
    
    initTabHandlers() {
        // Race tab handlers
        document.querySelectorAll('.race-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const race = e.currentTarget.dataset.race;
                this.onRaceSelect(race);
            });
        });
        
        // Type tab handlers  
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.onTypeSelect(type);
            });
        });
    }
    
    init() {
        document.getElementById('addRow').addEventListener('click', () => this.addRow());
        
        // Tab handlers
        this.initTabHandlers();
        
        this.chart.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.chart.addEventListener('wheel', (e) => this.handleWheel(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Row control handlers
        this.chart.addEventListener('click', (e) => {
            if (e.target.classList.contains('clear-row')) {
                const row = e.target.closest('.row');
                const rowIndex = parseInt(row.dataset.row);
                this.clearRow(rowIndex);
            } else if (e.target.classList.contains('align-left')) {
                const row = e.target.closest('.row');
                const rowIndex = parseInt(row.dataset.row);
                this.alignRowLeft(rowIndex);
            } else if (e.target.classList.contains('align-right')) {
                const row = e.target.closest('.row');
                const rowIndex = parseInt(row.dataset.row);
                this.alignRowRight(rowIndex);
            } else if (e.target.classList.contains('delete-row')) {
                const row = e.target.closest('.row');
                const rowIndex = parseInt(row.dataset.row);
                this.deleteRow(rowIndex);
            }
        });
        
        // Initialize state
        this.selectedRace = null;
        this.selectedType = null;
        this.searchTerm = '';
        this.allEntities = [];
        
        // Search functionality
        const searchInput = document.getElementById('entitySearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.onSearchInput(e.target.value));
        }
        
        // Setup click handlers
        this.addClickListener('#closeInfoPanel', () => this.hideInfoPanel());
        this.addClickListener('#downloadData', () => this.showDownloadMenu());
        this.addClickListener('#exportBuildOrder', () => this.exportBuildOrder());
    }
    
    async loadSC2Data() {
        try {
            const basePath = window.APP_BASE_PATH || '';
            const apiUrl = window.APP_API_URL || `${basePath}/api/sc2-data.json`;
            const response = await fetch(apiUrl);
            this.sc2Data = await response.json();
            console.log('SC2 data loaded:', this.sc2Data);
        } catch (error) {
            console.error('Failed to load SC2 data:', error);
        }
    }
    
    onRaceSelect(race) {
        // Update race tab states
        document.querySelectorAll('.race-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.race === race);
        });
        
        this.selectedRace = race;
        this.searchTerm = ''; // Clear search when race changes
        const searchInput = document.getElementById('entitySearch');
        if (searchInput) searchInput.value = '';
        this.updateEntityPalette();
    }
    
    onTypeSelect(type) {
        // Update type tab states
        document.querySelectorAll('.type-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        this.selectedType = type;
        this.searchTerm = ''; // Clear search when type changes
        const searchInput = document.getElementById('entitySearch');
        if (searchInput) searchInput.value = '';
        this.updateEntityPalette();
    }
    
    onSearchInput(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase().trim();
        this.updateEntityPalette();
    }
    
    updateEntityPalette() {
        const palette = document.getElementById('entityPalette');
        const content = document.getElementById('paletteContent');
        
        if (!this.selectedRace || !this.selectedType || !this.sc2Data) {
            palette.style.display = 'none';
            return;
        }
        
        const raceData = this.sc2Data.races[this.selectedRace];
        let entities = [];
        
        if (this.selectedType === 'units' || this.selectedType === 'buildings') {
            entities = Object.values(raceData.detailed_data)
                .filter(entity => entity.type === this.selectedType.slice(0, -1))
                .sort((a, b) => a.name.localeCompare(b.name));
        } else if (this.selectedType === 'upgrades') {
            entities = Object.values(raceData.upgrades || {})
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // Apply search filter
        if (this.searchTerm) {
            entities = entities.filter(entity => 
                entity.name.toLowerCase().includes(this.searchTerm) ||
                (entity.minerals && entity.minerals.toString().includes(this.searchTerm)) ||
                (entity.gas && entity.gas.toString().includes(this.searchTerm)) ||
                (entity.build_time && entity.build_time.toString().includes(this.searchTerm)) ||
                (entity.research_time && entity.research_time.toString().includes(this.searchTerm))
            );
        }
        
        content.innerHTML = '';
        
        entities.forEach(entity => {
            const iconButton = this.createElement('div', 'entity-icon-button');
            iconButton.dataset.entityData = JSON.stringify(entity);
            iconButton.dataset.entityType = this.selectedType;
            
            // Create image
            const img = document.createElement('img');
            img.src = this.getIconPath(entity, this.selectedType.slice(0, -1)); // Remove 's' from 'units'/'buildings'/'upgrades'
            img.alt = entity.name;
            img.onerror = () => {
                img.style.display = 'none';
            };
            iconButton.appendChild(img);
            
            // Add tooltip with entity name and stats
            const buildTime = this.getBuildTime(entity);
            const cost = this.getCost(entity);
            const tooltip = `${entity.name} - ${buildTime}s, ${cost.minerals}/${cost.gas}`;
            iconButton.setAttribute('data-tooltip', tooltip);
            
            // Add click handler
            iconButton.addEventListener('click', () => {
                this.addEntityFromIcon(entity, this.selectedType);
            });
            
            content.appendChild(iconButton);
        });
        
        palette.style.display = entities.length > 0 ? 'block' : 'none';
        
        // Update entity count
        const entityCountSpan = document.getElementById('entityCount');
        if (entityCountSpan) {
            entityCountSpan.textContent = entities.length;
        }
    }
    
    addEntityFromIcon(entityData, entityType) {
        // Use the existing addEntity logic but with provided data
        const buildTime = this.getBuildTime(entityData);
        const width = buildTime * this.timeScale;
        
        const rectangle = this.createElement('div', `rectangle entity-rectangle ${entityData.race} ${entityType.slice(0, -1)}`);
        rectangle.style.width = width + 'px';
        rectangle.style.left = '0px';
        rectangle.dataset.entityName = entityData.name;
        rectangle.dataset.entityType = entityType;
        
        // Create entity image
        const entityImage = document.createElement('img');
        entityImage.className = 'entity-image';
        
        entityImage.src = this.getIconPath(entityData, entityType);
        entityImage.alt = entityData.name;
        entityImage.onerror = () => {
            entityImage.style.display = 'none';
            // Time display positioning remains the same since it's already below the box
        };
        rectangle.appendChild(entityImage);
        
        // Create time display
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'entity-time';
        timeDisplay.textContent = `${buildTime}s`;
        rectangle.appendChild(timeDisplay);
        
        
        // Calculate position to place at end of existing entities in last row BEFORE adding to DOM
        const lastRowIndex = this.rows - 1;
        const rowRects = this.rectangles.filter(r => r.row === lastRowIndex);
        let initialX = 0;
        
        if (rowRects.length > 0) {
            // Place at the end of the last entity in this row
            const maxX = Math.max(...rowRects.map(r => r.x + r.width));
            initialX = maxX;
        }
        
        // Set position BEFORE adding to DOM
        rectangle.style.left = initialX + 'px';
        rectangle.style.top = '5px';
        
        // Now add to the last row
        const lastRow = this.getRowElement(lastRowIndex);
        lastRow.appendChild(rectangle);
        
        const rectData = {
            element: rectangle,
            row: lastRowIndex,
            x: initialX,
            width: width,
            id: this.rectangles.length,
            entityData: entityData,
            entityType: entityType
        };
        
        // Create delete button after rectData is created
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '×';
        deleteButton.title = 'Delete (Del key)';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteEntity(rectData);
        });
        rectangle.appendChild(deleteButton);
        
        // Add click handler to show info panel
        rectangle.addEventListener('click', (e) => {
            // Don't trigger if delete button was clicked
            if (e.target.classList.contains('delete-button')) return;
            this.showInfoPanel(entityData, rectData);
        });
        
        this.rectangles.push(rectData);
        this.positionRectangle(rectData);
        this.updateRowStats(lastRowIndex);
        this.createGridLines(); // Update grid lines when entities are added
        this.createTimeIndex(); // Update time index when entities are added
    }
    
    handleWheel(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newTimeScale = Math.max(0.5, Math.min(10, this.timeScale * scaleFactor));
            
            if (newTimeScale !== this.timeScale) {
                this.timeScale = newTimeScale;
                this.updateTimeScale();
            }
        }
    }
    
    updateTimeScale() {
        // Update all existing rectangles
        this.rectangles.forEach(rect => {
            if (rect.entityData) {
                const buildTime = this.getBuildTime(rect.entityData);
                const newWidth = buildTime * this.timeScale;
                rect.width = newWidth;
                rect.element.style.width = newWidth + 'px';
            }
        });
        this.repositionAllRectangles();
        this.updateAllRowStats();
        this.createGridLines(); // Update grid lines when scale changes
        this.createTimeIndex(); // Update time index when scale changes
        
        // Update the display in the toolbar
        const timeScaleDisplay = document.getElementById('timeScaleDisplay');
        if (timeScaleDisplay) {
            timeScaleDisplay.textContent = `Scale: ${this.timeScale.toFixed(1)}x`;
        }
    }
    
    handleKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectedRectangle) {
                this.deleteEntity(this.selectedRectangle);
                e.preventDefault();
            }
        }
    }
    
    deleteEntity(rectData) {
        if (!rectData) return;
        
        // Remove from DOM
        if (rectData.element && rectData.element.parentNode) {
            rectData.element.parentNode.removeChild(rectData.element);
        }
        
        // Remove from rectangles array
        const index = this.rectangles.findIndex(r => r.id === rectData.id);
        if (index !== -1) {
            this.rectangles.splice(index, 1);
        }
        
        // Clear selection
        if (this.selectedRectangle === rectData) {
            this.selectedRectangle = null;
        }
        
        // Reposition remaining rectangles in the row to close gaps
        this.collapseGap(rectData.row, rectData.x, rectData.width, -1);
        this.updateRowStats(rectData.row);
        this.createGridLines(); // Update grid lines when entities are removed
        this.createTimeIndex(); // Update time index when entities are removed
    }
    
    createGridLines() {
        const gridLines = document.getElementById('gridLines');
        if (!gridLines) return;
        
        gridLines.innerHTML = '';
        
        // Calculate the maximum time span needed
        const maxTime = this.getMaxTimeSpan();
        const chartWidth = this.chart.clientWidth - 140; // Account for padding (120 + 20)
        const entityStartOffset = 120; // Same offset as chart padding-left where entities start
        
        // Create vertical lines every 10 seconds starting at 0:00
        const interval = 10; // 10 second intervals
        
        for (let time = 0; time <= maxTime; time += interval) {
            const x = entityStartOffset + (time * this.timeScale);
            if (x > this.chart.clientWidth) break;
            
            const line = document.createElement('div');
            line.className = 'grid-line';
            line.style.left = x + 'px';
            gridLines.appendChild(line);
        }
    }
    
    createTimeIndex() {
        const timeIndex = document.getElementById('timeIndex');
        if (!timeIndex) return;
        
        timeIndex.innerHTML = '';
        
        // Calculate the maximum time span needed
        const maxTime = this.getMaxTimeSpan();
        const chartWidth = this.chart.clientWidth - 140; // Account for padding (120 + 20)
        
        // Create time markers every 30 seconds (or every minute for very long spans)
        const interval = maxTime > 600 ? 60 : 30; // 60s intervals for >10min, 30s otherwise
        
        for (let time = 0; time <= maxTime + interval; time += interval) {
            const x = time * this.timeScale;
            if (x > chartWidth) break;
            
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = x + 'px';
            
            marker.textContent = this.formatTime(time);
            
            timeIndex.appendChild(marker);
        }
    }
    
    getMaxTimeSpan() {
        if (this.rectangles.length === 0) return 300; // Default 5 minutes if no entities
        
        // Find the furthest right edge of any entity
        const maxEnd = Math.max(...this.rectangles.map(r => (r.x + r.width) / this.timeScale));
        return Math.max(300, Math.ceil(maxEnd / 30) * 30); // Minimum 5 minutes, rounded up to 30s
    }
    
    updateRowStats(rowIndex) {
        const rowRects = this.rectangles.filter(r => r.row === rowIndex);
        
        let endTime = 0;
        let totalMinerals = 0;
        let totalGas = 0;
        
        if (rowRects.length > 0) {
            // Calculate end time (furthest right edge of any entity)
            endTime = Math.max(...rowRects.map(r => (r.x + r.width) / this.timeScale));
            
            // Calculate total costs
            rowRects.forEach(rect => {
                if (rect.entityData) {
                    totalMinerals += rect.entityData.minerals || 0;
                    totalGas += rect.entityData.gas || 0;
                }
            });
        }
        
        const rowElement = this.getRowElement(rowIndex);
        if (rowElement) {
            const endTimeElement = rowElement.querySelector('.row-end-time');
            const costElement = rowElement.querySelector('.row-total-cost');
            
            if (endTimeElement) {
                endTimeElement.textContent = `End: ${this.formatTime(Math.round(endTime))}`;
            }
            if (costElement) {
                costElement.textContent = `Cost: ${totalMinerals}/${totalGas}`;
            }
        }
    }
    
    updateAllRowStats() {
        for (let i = 0; i < this.rows; i++) {
            this.updateRowStats(i);
        }
    }
    
    showInfoPanel(entityData, rectangleData = null) {
        const infoPanel = document.getElementById('infoPanel');
        const infoTitle = document.getElementById('infoTitle');
        const infoContent = document.getElementById('infoContent');
        
        if (!infoPanel || !infoTitle || !infoContent) return;
        
        infoTitle.textContent = entityData.name;
        infoContent.innerHTML = this.generateInfoPanelContent(entityData, rectangleData);
        infoPanel.style.display = 'block';
        
        // Add chronoboost event listeners if applicable
        this.addChronoboostHandlers(entityData, rectangleData);
    }
    
    hideInfoPanel() {
        const infoPanel = document.getElementById('infoPanel');
        if (infoPanel) {
            infoPanel.style.display = 'none';
        }
    }
    
    generateInfoPanelContent(entityData, rectangleData) {
        const buildTime = this.getBuildTime(entityData);
        const entityType = entityData.type || 'upgrade';
        const race = entityData.race || 'unknown';
        
        const imagePath = this.getIconPath(entityData, entityType);
        
        let html = `
            <div class="entity-info">
                <div class="entity-header">
                    <img src="${imagePath}" alt="${entityData.name}" class="entity-icon" onerror="this.style.display='none'">
                    <div class="entity-basic-info">
                        <h4>${entityData.name}</h4>
                        <div class="entity-type">${entityType} • ${race}</div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h5>Costs & Time</h5>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="label">Minerals</div>
                            <div class="value">${entityData.minerals || 0}</div>
                        </div>
                        <div class="info-item">
                            <div class="label">Gas</div>
                            <div class="value">${entityData.gas || 0}</div>
                        </div>
                        <div class="info-item">
                            <div class="label">Build Time</div>
                            <div class="value">${buildTime}s</div>
                        </div>
                        <div class="info-item">
                            <div class="label">Supply</div>
                            <div class="value">${entityData.supply || 0}</div>
                        </div>
                    </div>
                </div>`;
        
        // Add requirements section
        if (entityData.requires && entityData.requires.length > 0) {
            html += `
                <div class="info-section">
                    <h5>Requirements</h5>
                    <ul class="info-list">`;
            entityData.requires.forEach(req => {
                html += `<li>${req}</li>`;
            });
            html += `</ul></div>`;
        }
        
        // Add produces section
        if (entityData.produces && entityData.produces.length > 0) {
            html += `
                <div class="info-section">
                    <h5>Produces</h5>
                    <ul class="info-list">`;
            entityData.produces.forEach(prod => {
                html += `<li>${prod}</li>`;
            });
            html += `</ul></div>`;
        }
        
        // Add unlocks section
        if (entityData.unlocks && entityData.unlocks.length > 0) {
            html += `
                <div class="info-section">
                    <h5>Unlocks</h5>
                    <ul class="info-list">`;
            entityData.unlocks.forEach(unlock => {
                html += `<li>${unlock}</li>`;
            });
            html += `</ul></div>`;
        }
        
        // Add timing information if this is a placed entity
        if (rectangleData) {
            const startTime = rectangleData.x / this.timeScale;
            const endTime = startTime + buildTime;
            
            html += `
                <div class="info-section">
                    <h5>Timeline</h5>
                    <div class="timing-info">
                        <div class="timing-item">
                            <span>Start Time:</span>
                            <span>${this.formatTime(startTime)}</span>
                        </div>
                        <div class="timing-item">
                            <span>End Time:</span>
                            <span>${this.formatTime(endTime)}</span>
                        </div>
                    </div>
                </div>`;
        }
        
        // Add chronoboost section for Protoss units and upgrades
        if (race === 'protoss' && (entityType === 'unit' || entityType === 'upgrade') && rectangleData) {
            const originalTime = rectangleData.originalBuildTime || buildTime;
            const currentCount = rectangleData.chronoboostCount || 0;
            const maxChronoboosts = Math.floor(originalTime / 30);
            const timeSaved = currentCount * 10;
            
            html += `
                <div class="chronoboost-section">
                    <h5>Chronoboost</h5>
                    <p>Each chronoboost reduces build time by 10 seconds</p>
                    
                    <div class="chronoboost-controls">
                        <button class="chronoboost-decrease" data-rect-id="${rectangleData.id}" ${currentCount <= 0 ? 'disabled' : ''}>
                            −
                        </button>
                        <span class="chronoboost-count">${currentCount}</span>
                        <button class="chronoboost-increase" data-rect-id="${rectangleData.id}" ${currentCount >= maxChronoboosts ? 'disabled' : ''}>
                            +
                        </button>
                    </div>
                    
                    <div class="chronoboost-info">
                        <div class="chrono-stat">
                            <span>Original time:</span>
                            <span>${originalTime}s</span>
                        </div>
                        <div class="chrono-stat">
                            <span>Time saved:</span>
                            <span>-${timeSaved}s</span>
                        </div>
                        <div class="chrono-stat current-time">
                            <span>Current time:</span>
                            <span>${buildTime}s</span>
                        </div>
                    </div>
                    
                    <p style="font-size: 11px; opacity: 0.7; margin-top: 8px;">
                        Max: ${maxChronoboosts} chronoboosts (1 per 30s of build time)
                    </p>
                </div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    addChronoboostHandlers(entityData, rectangleData) {
        if (!rectangleData || entityData.race !== 'protoss') return;
        
        this.addClickListener('.chronoboost-increase', () => {
            this.applyChronoboost(rectangleData, 1);
        });
        
        this.addClickListener('.chronoboost-decrease', () => {
            this.applyChronoboost(rectangleData, -1);
        });
    }
    
    applyChronoboost(rectangleData, change = 1) {
        if (!rectangleData || !rectangleData.entityData) return;
        
        // Initialize chronoboost data
        if (!rectangleData.originalBuildTime) {
            rectangleData.originalBuildTime = this.getBuildTime(rectangleData.entityData);
        }
        if (rectangleData.chronoboostCount === undefined) {
            rectangleData.chronoboostCount = 0;
        }
        
        // Update chronoboost count
        const newCount = Math.max(0, rectangleData.chronoboostCount + change);
        
        // Calculate maximum possible chronoboosts
        // One chronoboost per 30 seconds of build time
        const maxChronoboosts = Math.floor(rectangleData.originalBuildTime / 30);
        
        // Cap the chronoboost count
        rectangleData.chronoboostCount = Math.min(newCount, maxChronoboosts);
        
        // Calculate new build time
        const timeSaved = rectangleData.chronoboostCount * 10;
        const newBuildTime = rectangleData.originalBuildTime - timeSaved;
        const newWidth = newBuildTime * this.timeScale;
        
        // Update entity data with new time
        if (rectangleData.entityData.build_time) {
            rectangleData.entityData.build_time = newBuildTime;
        } else if (rectangleData.entityData.research_time) {
            rectangleData.entityData.research_time = newBuildTime;
        }
        
        // Update rectangle width
        rectangleData.width = newWidth;
        rectangleData.element.style.width = newWidth + 'px';
        
        // Update time display on the rectangle
        const timeDisplay = rectangleData.element.querySelector('.entity-time');
        if (timeDisplay) {
            timeDisplay.textContent = `${newBuildTime}s`;
        }
        
        // Update visual indicator for chronoboost
        if (rectangleData.chronoboostCount > 0) {
            rectangleData.element.classList.add('chronoboosted');
            rectangleData.chronoboosted = true;
        } else {
            rectangleData.element.classList.remove('chronoboosted');
            rectangleData.chronoboosted = false;
        }
        
        // Reposition rectangles and update stats
        this.repositionAllRectangles();
        this.updateRowStats(rectangleData.row);
        this.createGridLines(); // Update grid lines when chronoboost changes timing
        this.createTimeIndex(); // Update time index when chronoboost changes timing
        
        // Update info panel with new data
        this.showInfoPanel(rectangleData.entityData, rectangleData);
        
        console.log(`Chronoboost updated for ${rectangleData.entityData.name}: ${rectangleData.chronoboostCount} boosts, ${rectangleData.originalBuildTime}s → ${newBuildTime}s`);
    }
    
    
    addRow() {
        const row = document.createElement('div');
        row.className = 'row';
        row.dataset.row = this.rows;
        
        const label = document.createElement('div');
        label.className = 'row-label';
        label.textContent = `Row ${this.rows + 1}`;
        row.appendChild(label);
        
        const stats = document.createElement('div');
        stats.className = 'row-stats';
        stats.innerHTML = this.createRowStatsHTML();
        row.appendChild(stats);
        
        // Add row controls
        const controls = document.createElement('div');
        controls.className = 'row-controls';
        controls.innerHTML = this.createRowControlsHTML();
        row.appendChild(controls);
        
        this.chart.appendChild(row);
        this.rows++;
    }
    
    
    repositionAllRectangles() {
        // Reposition all rectangles to avoid overlaps after scaling
        for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
            const rowRects = this.rectangles
                .filter(r => r.row === rowIndex)
                .sort((a, b) => a.x - b.x);
            
            let currentX = 0;
            rowRects.forEach(rect => {
                rect.x = currentX;
                rect.element.style.left = currentX + 'px';
                currentX += rect.width;
            });
        }
    }
    
    positionRectangle(rectData) {
        // Always use sequential positioning - place at the end if no collision
        const validX = this.findValidPosition(rectData.row, rectData.x, rectData.width, rectData.id);
        rectData.x = validX;
        rectData.element.style.left = validX + 'px';
        rectData.element.style.top = '5px';
    }
    
    findValidPosition(row, desiredX, width, excludeId = -1) {
        const insertionPoints = this.getInsertionPoints(row, excludeId);
        
        if (insertionPoints.length === 0) {
            return 0;
        }
        
        // Find the closest insertion point to the desired position
        let bestX = insertionPoints[0];
        let minDistance = Math.abs(desiredX - bestX);
        
        for (const insertX of insertionPoints) {
            const distance = Math.abs(desiredX - insertX);
            if (distance < minDistance) {
                bestX = insertX;
                minDistance = distance;
            }
        }
        
        // If we're inserting in the middle, push other rectangles to the right
        if (bestX < this.getRowEndPosition(row, excludeId)) {
            this.pushRectanglesRight(row, bestX, width, excludeId);
        }
        
        return bestX;
    }
    
    getRowEndPosition(row, excludeId = -1) {
        const rowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId);
        if (rowRects.length === 0) return 0;
        return Math.max(...rowRects.map(r => r.x + r.width));
    }
    
    pushRectanglesRight(row, insertX, insertWidth, excludeId = -1) {
        const rowRects = this.rectangles
            .filter(r => r.row === row && r.id !== excludeId)
            .sort((a, b) => a.x - b.x);
        
        // Push all rectangles that start at or after the insertion point
        for (const rect of rowRects) {
            if (rect.x >= insertX) {
                rect.x += insertWidth;
                rect.element.style.left = rect.x + 'px';
                rect.element.style.top = '5px';
            }
        }
    }
    
    getValidPositions(row, excludeId = -1) {
        const positions = [0];
        
        const currentRowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId);
        for (const rect of currentRowRects) {
            positions.push(rect.x + rect.width);
        }
        
        // Add alignment positions from all other rows (not just adjacent)
        for (let otherRow = 0; otherRow < this.rows; otherRow++) {
            if (otherRow !== row) {
                const otherRowRects = this.rectangles.filter(r => r.row === otherRow);
                for (const rect of otherRowRects) {
                    positions.push(rect.x);
                    positions.push(rect.x + rect.width);
                }
            }
        }
        
        return [...new Set(positions)].sort((a, b) => a - b);
    }
    
    hasCollision(row, x, width, excludeId = -1) {
        const rowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId);
        
        for (const rect of rowRects) {
            if (x < rect.x + rect.width && x + width > rect.x) {
                return true;
            }
        }
        return false;
    }
    
    findInsertionPosition(row, desiredX, width, excludeId = -1) {
        const validPositions = this.getValidPositions(row, excludeId);
        const rowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId)
            .sort((a, b) => a.x - b.x);
        
        for (const validX of validPositions) {
            const wouldCollide = this.hasCollision(row, validX, width, excludeId);
            if (wouldCollide) {
                this.pushRectangles(row, validX, width, excludeId);
                if (!this.hasCollision(row, validX, width, excludeId)) {
                    return validX;
                }
            } else {
                return validX;
            }
        }
        
        const lastValidPosition = validPositions[validPositions.length - 1] || 0;
        return lastValidPosition;
    }
    
    
    handleMouseDown(e) {
        const rectangle = e.target.closest('.rectangle');
        if (!rectangle) return;
        
        const rectData = this.rectangles.find(r => r.element === rectangle);
        if (!rectData) {
            console.warn('Rectangle data not found for element:', rectangle);
            return;
        }
        
        this.selectedRectangle = rectData;
        rectangle.classList.add('selected');
        
        {
            const chartRect = this.chart.getBoundingClientRect();
            
            // Find all rectangles to the right that should move with this one
            // Only include rectangles that are strictly to the right (not at the same position)
            const rightwardRects = this.rectangles.filter(rect => 
                rect.row === rectData.row && 
                rect.id !== rectData.id && 
                rect.x > rectData.x
            );
            
            this.dragData = {
                rectangle: rectData,
                offsetX: e.clientX - chartRect.left - rectData.x,
                offsetY: e.clientY - chartRect.top - (rectData.row * 105 + 47),
                startX: rectData.x,
                startY: rectData.row * 105 + 47,
                originalRow: rectData.row,
                rightwardRects: rightwardRects // Store the boxes to move with this one
            };
            
                this.showDropZones(rectData.x, rectData.row);
        }
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (this.dragData) {
            const chartRect = this.chart.getBoundingClientRect();
            const x = e.clientX - chartRect.left - this.dragData.offsetX;
            const y = e.clientY - chartRect.top - this.dragData.offsetY;
            
            const newRow = Math.max(0, Math.min(this.rows - 1, Math.floor((y + 47) / 105)));
            
            if (newRow !== this.dragData.rectangle.row) {
                const oldRow = this.chart.querySelector(`.row[data-row="${this.dragData.rectangle.row}"]`);
                const newRowElement = this.chart.querySelector(`.row[data-row="${newRow}"]`);
                
                if (newRowElement && oldRow) {
                    try {
                        // Move the main rectangle
                        oldRow.removeChild(this.dragData.rectangle.element);
                        newRowElement.appendChild(this.dragData.rectangle.element);
                        this.dragData.rectangle.row = newRow;
                        
                        // Move all rightward rectangles to the new row
                        this.dragData.rightwardRects.forEach(rect => {
                            if (rect.element && rect.element.parentNode) {
                                oldRow.removeChild(rect.element);
                                newRowElement.appendChild(rect.element);
                                rect.row = newRow;
                            }
                        });
                    } catch (error) {
                        console.error('Error moving between rows:', error);
                    }
                }
            }
            
            // Group dragging logic - move selected box and all boxes to the right
            const oldX = this.dragData.rectangle.x;
            const newX = Math.max(0, x);
            const deltaX = newX - oldX;
            
            this.dragData.rectangle.x = newX;
            
            // Move the selected rectangle
            this.dragData.rectangle.element.style.left = this.dragData.rectangle.x + 'px';
            this.dragData.rectangle.element.style.top = '5px';
            
            // Move all pre-calculated rightward rectangles by the same delta
            // But ensure they don't move to the left of the main rectangle
            let currentX = this.dragData.rectangle.x + this.dragData.rectangle.width;
            this.dragData.rightwardRects.forEach(rect => {
                rect.x = Math.max(currentX, rect.x + deltaX);
                rect.element.style.left = rect.x + 'px';
                rect.element.style.top = '5px';
                currentX = rect.x + rect.width;
            });
            
            this.showDropZones(this.dragData.rectangle.x, newRow);
        }
    }
    
    handleMouseUp(e) {
        if (this.dragData) {
            this.hideDropZones();
            
            const originalRow = this.dragData.originalRow;
            const originalX = this.dragData.startX;
            
            // After dropping, position the element at the nearest valid insertion point
            this.positionAtInsertionPoint(this.dragData.rectangle);
            
            // Update stats for both old and new rows
            this.updateRowStats(originalRow);
            if (this.dragData.rectangle.row !== originalRow) {
                this.updateRowStats(this.dragData.rectangle.row);
            }
            
            this.dragData = null;
        }
        
        
        if (this.selectedRectangle) {
            this.selectedRectangle.element.classList.remove('selected');
            this.selectedRectangle = null;
        }
    }
    
    showDropZones(dragX = null, dragRow = null) {
        this.hideDropZones();
        
        const proximityThreshold = 30; // pixels
        
        for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
            const rowElement = this.getRowElement(rowIndex);
            
            // Use the standard insertion logic for sequential placement
            const insertionPoints = this.getInsertionPoints(rowIndex, this.dragData.rectangle.id);
            
            insertionPoints.forEach((point, index) => {
                // Only show drop zone if no drag position is provided (initial call) 
                // or if the drag position is close to this drop zone
                if (dragX !== null && dragRow !== null) {
                    if (dragRow !== rowIndex || Math.abs(dragX - point) > proximityThreshold) {
                        return; // Skip this drop zone
                    }
                }
                
                const dropZone = document.createElement('div');
                dropZone.className = 'drop-zone';
                dropZone.style.left = point + 'px';
                dropZone.dataset.row = rowIndex;
                dropZone.dataset.position = point;
                rowElement.appendChild(dropZone);
            });
        }
    }
    
    
    
    hideDropZones() {
        const dropZones = this.chart.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => zone.remove());
    }
    
    getInsertionPoints(row, excludeId = -1) {
        const rowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId)
            .sort((a, b) => a.x - b.x);
        
        const points = [0];
        
        // Add start positions of entities in current row (for insertion before them)
        for (const rect of rowRects) {
            points.push(rect.x);
        }
        
        // Add end positions of entities in current row (for insertion after them)
        for (const rect of rowRects) {
            points.push(rect.x + rect.width);
        }
        
        // Add alignment points from all other rows
        for (let otherRow = 0; otherRow < this.rows; otherRow++) {
            if (otherRow !== row) {
                const otherRowRects = this.rectangles.filter(r => r.row === otherRow);
                for (const rect of otherRowRects) {
                    points.push(rect.x);
                    points.push(rect.x + rect.width);
                }
            }
        }
        
        return [...new Set(points)].sort((a, b) => a - b);
    }
    
    positionAtInsertionPoint(draggedRect) {
        const targetRow = draggedRect.row;
        
        // Get all rectangles in this row (excluding the dragged group)
        const otherRects = this.rectangles.filter(r => 
            r.row === targetRow && 
            r.id !== draggedRect.id && 
            !this.dragData.rightwardRects.includes(r)
        );
        
        // Create the new order: determine where the dragged group should be inserted
        const allRects = [...otherRects];
        const draggedGroup = [draggedRect, ...this.dragData.rightwardRects];
        
        // Find insertion index based on dragged rectangle's current X position
        let insertIndex = 0;
        for (let i = 0; i < otherRects.length; i++) {
            if (draggedRect.x <= otherRects[i].x) {
                insertIndex = i;
                break;
            }
            insertIndex = i + 1;
        }
        
        // Insert the dragged group at the determined position
        allRects.splice(insertIndex, 0, ...draggedGroup);
        
        // Position all rectangles sequentially
        let currentPosition = 0;
        allRects.forEach(rect => {
            rect.x = currentPosition;
            rect.element.style.left = currentPosition + 'px';
            rect.element.style.top = '5px';
            currentPosition += rect.width;
        });
    }
    
    collapseGap(row, gapStartX, gapWidth, excludeId) {
        const rowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId)
            .sort((a, b) => a.x - b.x);
        
        // Only shift rectangles that are to the right of the gap
        for (const rect of rowRects) {
            if (rect.x > gapStartX) {
                rect.x = Math.max(0, rect.x - gapWidth);
                rect.element.style.left = rect.x + 'px';
                rect.element.style.top = '5px';
            }
        }
    }
    
    clearRow(rowIndex) {
        const rowRects = this.rectangles.filter(r => r.row === rowIndex);
        
        // Remove each rectangle from DOM and array
        rowRects.forEach(rectData => {
            if (rectData.element && rectData.element.parentNode) {
                rectData.element.parentNode.removeChild(rectData.element);
            }
            const index = this.rectangles.findIndex(r => r.id === rectData.id);
            if (index !== -1) {
                this.rectangles.splice(index, 1);
            }
        });
        
        // Clear selection if it was in this row
        if (this.selectedRectangle && this.selectedRectangle.row === rowIndex) {
            this.selectedRectangle = null;
        }
        
        // Update row stats
        this.updateRowStats(rowIndex);
        
        console.log(`Cleared row ${rowIndex + 1}`);
    }
    
    alignRowLeft(rowIndex) {
        const rowRects = this.rectangles
            .filter(r => r.row === rowIndex)
            .sort((a, b) => a.x - b.x);
        
        if (rowRects.length === 0) return;
        
        // Align all rectangles to the left (x = 0) while maintaining their relative order
        let currentX = 0;
        rowRects.forEach(rect => {
            rect.x = currentX;
            rect.element.style.left = currentX + 'px';
            currentX += rect.width;
        });
        
        this.updateRowStats(rowIndex);
        console.log(`Aligned row ${rowIndex + 1} to left`);
    }
    
    alignRowRight(rowIndex) {
        const rowRects = this.rectangles
            .filter(r => r.row === rowIndex)
            .sort((a, b) => a.x - b.x);
        
        if (rowRects.length === 0) return;
        
        // Calculate total width of all rectangles in row
        const totalWidth = rowRects.reduce((sum, rect) => sum + rect.width, 0);
        
        // Find the end position of the row above (previous row)
        let alignmentX = 0;
        if (rowIndex > 0) {
            const prevRowRects = this.rectangles.filter(r => r.row === rowIndex - 1);
            if (prevRowRects.length > 0) {
                // Get the rightmost position of the previous row
                alignmentX = Math.max(...prevRowRects.map(r => r.x + r.width));
            }
        }
        
        // Calculate starting position to align with the end of the row above
        const startX = Math.max(0, alignmentX - totalWidth);
        
        // Position rectangles from the calculated start position, maintaining order
        let currentX = startX;
        rowRects.forEach(rect => {
            rect.x = currentX;
            rect.element.style.left = currentX + 'px';
            currentX += rect.width;
        });
        
        this.updateRowStats(rowIndex);
        console.log(`Aligned row ${rowIndex + 1} to align with end of row above`);
    }
    
    deleteRow(rowIndex) {
        // Don't allow deleting if it's the only row
        if (this.rows <= 1) {
            alert('Cannot delete the last remaining row.');
            return;
        }
        
        // Clear all rectangles from this row first
        this.clearRow(rowIndex);
        
        // Remove the row element from DOM
        const rowElement = this.getRowElement(rowIndex);
        if (rowElement && rowElement.parentNode) {
            rowElement.parentNode.removeChild(rowElement);
        }
        
        // Update row indices for all rows after the deleted one
        for (let i = rowIndex + 1; i < this.rows; i++) {
            const row = this.getRowElement(i);
            if (row) {
                row.dataset.row = i - 1;
                const label = row.querySelector('.row-label');
                if (label) {
                    label.textContent = `Row ${i}`;
                }
            }
        }
        
        // Update rectangles that were in rows after the deleted one
        this.rectangles.forEach(rect => {
            if (rect.row > rowIndex) {
                rect.row -= 1;
            }
        });
        
        // Decrease total row count
        this.rows--;
        
        console.log(`Deleted row ${rowIndex + 1}`);
    }
    
    showDownloadMenu() {
        // Simple implementation using confirm dialogs
        const choice = prompt(
            'Choose download option:\n' +
            '1 - Full SC2 data\n' +
            '2 - Protoss data only\n' +
            '3 - Terran data only\n' +
            '4 - Zerg data only\n' +
            'Enter 1, 2, 3, or 4:'
        );
        
        switch(choice) {
            case '1':
                this.downloadFile('/download/sc2-data');
                break;
            case '2':
                this.downloadFile('/download/sc2-data/protoss');
                break;
            case '3':
                this.downloadFile('/download/sc2-data/terran');
                break;
            case '4':
                this.downloadFile('/download/sc2-data/zerg');
                break;
            default:
                if (choice !== null) {
                    alert('Invalid choice. Please select 1, 2, 3, or 4.');
                }
        }
    }
    
    downloadFile(url) {
        // Create a temporary anchor element and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Downloading file from: ${url}`);
    }
    
    async exportBuildOrder() {
        try {
            // Collect all rectangles data for export
            const buildOrder = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    timeScale: this.timeScale,
                    totalRows: this.rows
                },
                rows: []
            };
            
            // Group rectangles by row
            for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
                const rowRects = this.rectangles
                    .filter(r => r.row === rowIndex)
                    .sort((a, b) => a.x - b.x);
                
                const rowData = {
                    rowIndex: rowIndex,
                    entities: rowRects.map(rect => ({
                        name: rect.entityData.name,
                        type: rect.entityType,
                        race: rect.entityData.race,
                        startTime: rect.x / this.timeScale,
                        buildTime: this.getBuildTime(rect.entityData),
                        minerals: rect.entityData.minerals || 0,
                        gas: rect.entityData.gas || 0,
                        chronoboosted: rect.chronoboosted || false,
                        chronoboostCount: rect.chronoboostCount || 0
                    }))
                };
                
                // Calculate row statistics
                if (rowRects.length > 0) {
                    const endTime = Math.max(...rowRects.map(r => (r.x + r.width) / this.timeScale));
                    const totalMinerals = rowRects.reduce((sum, r) => sum + (r.entityData.minerals || 0), 0);
                    const totalGas = rowRects.reduce((sum, r) => sum + (r.entityData.gas || 0), 0);
                    
                    rowData.stats = {
                        endTime: endTime,
                        totalMinerals: totalMinerals,
                        totalGas: totalGas
                    };
                }
                
                buildOrder.rows.push(rowData);
            }
            
            // Check if we're in static hosting mode
            if (window.APP_STATIC_MODE) {
                // Static hosting - direct client-side download
                const blob = new Blob([JSON.stringify(buildOrder, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'build_order.json';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('Build order exported successfully');
            } else {
                // Server-side export
                const response = await fetch('/export/build-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(buildOrder)
                });
                
                if (response.ok) {
                    // Trigger download
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'build_order.json';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                    console.log('Build order exported successfully');
                } else {
                    throw new Error(`Export failed: ${response.statusText}`);
                }
            }
            
        } catch (error) {
            console.error('Error exporting build order:', error);
            alert('Failed to export build order. Please check the console for details.');
        }
    }
}

window.addEventListener('load', () => {
    window.ganttChart = new GanttChart();
});

window.addEventListener('resize', () => {
    if (window.ganttChart) {
        window.ganttChart.createGridLines();
        window.ganttChart.createTimeIndex();
    }
});