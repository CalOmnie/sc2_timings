class GanttChart {
    constructor() {
        this.chart = document.getElementById('chart');
        this.rectangles = [];
        this.rows = 1;
        this.selectedRectangle = null;
        this.dragData = null;
        this.resizeData = null;
        this.gridSize = 20;
        this.sc2Data = null;
        this.timeScale = 3; // pixels per second
        
        this.init();
        this.createGridLines();
        this.createTimeIndex();
        this.loadSC2Data();
    }
    
    init() {
        document.getElementById('addRow').addEventListener('click', () => this.addRow());
        
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
        
        // Info panel functionality
        const closeInfoPanel = document.getElementById('closeInfoPanel');
        if (closeInfoPanel) {
            closeInfoPanel.addEventListener('click', () => this.hideInfoPanel());
        }
        
        // Download functionality
        const downloadDataBtn = document.getElementById('downloadData');
        if (downloadDataBtn) {
            downloadDataBtn.addEventListener('click', () => this.showDownloadMenu());
        }
        
        const exportBuildOrderBtn = document.getElementById('exportBuildOrder');
        if (exportBuildOrderBtn) {
            exportBuildOrderBtn.addEventListener('click', () => this.exportBuildOrder());
        }
    }
    
    async loadSC2Data() {
        try {
            const response = await fetch('/api/sc2-data');
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
            const iconButton = document.createElement('div');
            iconButton.className = 'entity-icon-button';
            iconButton.dataset.entityData = JSON.stringify(entity);
            iconButton.dataset.entityType = this.selectedType;
            
            // Create image
            const img = document.createElement('img');
            let imagePath;
            if (this.selectedType === 'units') {
                imagePath = `/assets/icons/${this.selectedRace}/units/${entity.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
            } else if (this.selectedType === 'buildings') {
                imagePath = `/assets/icons/${this.selectedRace}/buildings/${entity.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
            } else if (this.selectedType === 'upgrades') {
                imagePath = `/assets/icons/${this.selectedRace}/upgrades/${entity.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
            }
            
            img.src = imagePath;
            img.alt = entity.name;
            img.onerror = () => {
                img.style.display = 'none';
            };
            iconButton.appendChild(img);
            
            // Add tooltip with entity name and stats
            const buildTime = entity.build_time || entity.research_time || 0;
            const tooltip = `${entity.name} - ${buildTime}s, ${entity.minerals}/${entity.gas || 0}`;
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
        const buildTime = entityData.build_time || entityData.research_time || 0;
        const width = buildTime * this.timeScale;
        
        const rectangle = document.createElement('div');
        rectangle.className = `rectangle entity-rectangle ${entityData.race} ${entityType.slice(0, -1)}`;
        rectangle.style.width = width + 'px';
        rectangle.style.left = '0px';
        rectangle.dataset.entityName = entityData.name;
        rectangle.dataset.entityType = entityType;
        
        // Create entity image
        const entityImage = document.createElement('img');
        entityImage.className = 'entity-image';
        
        // Determine image path based on entity type
        let imagePath;
        if (entityType === 'units') {
            imagePath = `/assets/icons/${entityData.race}/units/${entityData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        } else if (entityType === 'buildings') {
            imagePath = `/assets/icons/${entityData.race}/buildings/${entityData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        } else if (entityType === 'upgrades') {
            imagePath = `/assets/icons/${entityData.race}/upgrades/${entityData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        }
        
        entityImage.src = imagePath;
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
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        rectangle.appendChild(resizeHandle);
        
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
        const lastRow = this.chart.querySelector(`.row[data-row="${lastRowIndex}"]`);
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
                const buildTime = rect.entityData.build_time || rect.entityData.research_time || 0;
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
        const chartWidth = this.chart.clientWidth - 120; // Account for padding
        const entityStartOffset = 100; // Same offset as chart padding-left where entities start
        
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
        const chartWidth = this.chart.clientWidth - 120; // Account for padding
        
        // Create time markers every 30 seconds (or every minute for very long spans)
        const interval = maxTime > 600 ? 60 : 30; // 60s intervals for >10min, 30s otherwise
        
        for (let time = 0; time <= maxTime + interval; time += interval) {
            const x = time * this.timeScale;
            if (x > chartWidth) break;
            
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = x + 'px';
            
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            marker.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
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
        
        const rowElement = this.chart.querySelector(`.row[data-row="${rowIndex}"]`);
        if (rowElement) {
            const endTimeElement = rowElement.querySelector('.row-end-time');
            const costElement = rowElement.querySelector('.row-total-cost');
            
            if (endTimeElement) {
                const minutes = Math.floor(endTime / 60);
                const seconds = Math.round(endTime % 60);
                endTimeElement.textContent = `End: ${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        const buildTime = entityData.build_time || entityData.research_time || 0;
        const entityType = entityData.type || 'upgrade';
        const race = entityData.race || 'unknown';
        
        // Generate image path
        let imagePath = `/assets/icons/${race}/${entityType}s/${entityData.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        
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
        
        const increaseButton = document.querySelector('.chronoboost-increase');
        const decreaseButton = document.querySelector('.chronoboost-decrease');
        
        if (increaseButton) {
            increaseButton.addEventListener('click', () => {
                this.applyChronoboost(rectangleData, 1);
            });
        }
        
        if (decreaseButton) {
            decreaseButton.addEventListener('click', () => {
                this.applyChronoboost(rectangleData, -1);
            });
        }
    }
    
    applyChronoboost(rectangleData, change = 1) {
        if (!rectangleData || !rectangleData.entityData) return;
        
        // Initialize chronoboost data
        if (!rectangleData.originalBuildTime) {
            rectangleData.originalBuildTime = rectangleData.entityData.build_time || rectangleData.entityData.research_time || 0;
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
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        stats.innerHTML = `
            <div class="row-end-time">End: 0:00</div>
            <div class="row-total-cost">Cost: 0/0</div>
        `;
        row.appendChild(stats);
        
        // Add row controls
        const controls = document.createElement('div');
        controls.className = 'row-controls';
        controls.innerHTML = `
            <button class="row-control-btn clear-row" title="Clear Row">🗑️</button>
            <button class="row-control-btn align-left" title="Align Left">⇤</button>
            <button class="row-control-btn align-right" title="Align with Row Above End">⇥</button>
        `;
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
        
        if (e.target.classList.contains('resize-handle')) {
            this.resizeData = {
                rectangle: rectData,
                startX: e.clientX,
                startWidth: rectData.width
            };
        } else {
            const rect = rectangle.getBoundingClientRect();
            const chartRect = this.chart.getBoundingClientRect();
            
            this.dragData = {
                rectangle: rectData,
                offsetX: e.clientX - rect.left,
                offsetY: e.clientY - rect.top,
                startX: rectData.x,
                startY: rect.top - chartRect.top,
                originalRow: rectData.row
            };
            
                this.showDropZones();
        }
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (this.resizeData) {
            const deltaX = e.clientX - this.resizeData.startX;
            const newWidth = Math.max(60, this.resizeData.startWidth + deltaX);
            
            this.resizeData.rectangle.width = newWidth;
            this.resizeData.rectangle.element.style.width = newWidth + 'px';
            
        } else if (this.dragData) {
            const chartRect = this.chart.getBoundingClientRect();
            const x = e.clientX - chartRect.left - this.dragData.offsetX;
            const y = e.clientY - chartRect.top - this.dragData.offsetY;
            
            const newRow = Math.max(0, Math.min(this.rows - 1, Math.floor((y + 47) / 105)));
            
            if (newRow !== this.dragData.rectangle.row) {
                const oldRow = this.chart.querySelector(`.row[data-row="${this.dragData.rectangle.row}"]`);
                const newRowElement = this.chart.querySelector(`.row[data-row="${newRow}"]`);
                
                if (newRowElement && oldRow) {
                    try {
                        oldRow.removeChild(this.dragData.rectangle.element);
                        newRowElement.appendChild(this.dragData.rectangle.element);
                        this.dragData.rectangle.row = newRow;
                    } catch (error) {
                        console.error('Error moving between rows:', error);
                    }
                }
            }
            
            // Simple positioning logic for dragging
            this.dragData.rectangle.x = Math.max(0, x);
            this.dragData.rectangle.element.style.left = this.dragData.rectangle.x + 'px';
            this.dragData.rectangle.element.style.top = '5px';
            
            this.updateDropZones(x, newRow);
        }
    }
    
    handleMouseUp(e) {
        if (this.dragData) {
            this.hideDropZones();
            
            const originalRow = this.dragData.originalRow;
            const originalX = this.dragData.startX;
            
            // Always collapse gaps to maintain sequential placement
            this.collapseGap(originalRow, originalX, this.dragData.rectangle.width, this.dragData.rectangle.id);
            
            this.positionRectangle(this.dragData.rectangle);
            
            // Update stats for both old and new rows
            this.updateRowStats(originalRow);
            if (this.dragData.rectangle.row !== originalRow) {
                this.updateRowStats(this.dragData.rectangle.row);
            }
            
            this.dragData = null;
        }
        
        if (this.resizeData) {
            this.positionRectangle(this.resizeData.rectangle);
            this.updateRowStats(this.resizeData.rectangle.row);
            this.resizeData = null;
        }
        
        if (this.selectedRectangle) {
            this.selectedRectangle.element.classList.remove('selected');
            this.selectedRectangle = null;
        }
    }
    
    showDropZones() {
        this.hideDropZones();
        this.showAlignmentGuides();
        
        for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
            const rowElement = this.chart.querySelector(`.row[data-row="${rowIndex}"]`);
            
            // Use the standard insertion logic for sequential placement
            const insertionPoints = this.getInsertionPoints(rowIndex, this.dragData.rectangle.id);
            
            insertionPoints.forEach((point, index) => {
                const dropZone = document.createElement('div');
                dropZone.className = 'drop-zone';
                dropZone.style.left = point + 'px';
                dropZone.dataset.row = rowIndex;
                dropZone.dataset.position = point;
                rowElement.appendChild(dropZone);
            });
        }
    }
    
    updateDropZones(dragX, dragRow) {
        const dropZones = this.chart.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            zone.classList.remove('active');
            const zoneX = parseInt(zone.dataset.position);
            const zoneRow = parseInt(zone.dataset.row);
            
            if (zoneRow === dragRow && Math.abs(dragX - zoneX) < 30) {
                zone.classList.add('active');
            }
        });
    }
    
    showAlignmentGuides() {
        this.hideAlignmentGuides();
        
        // Get all unique X positions from all entities
        const allPositions = [];
        this.rectangles.forEach(rect => {
            allPositions.push(rect.x);
            allPositions.push(rect.x + rect.width);
        });
        
        const uniquePositions = [...new Set(allPositions)].sort((a, b) => a - b);
        
        uniquePositions.forEach(x => {
            const guide = document.createElement('div');
            guide.className = 'alignment-guide';
            guide.style.left = x + 'px';
            guide.dataset.position = x;
            this.chart.appendChild(guide);
        });
    }
    
    hideAlignmentGuides() {
        const guides = this.chart.querySelectorAll('.alignment-guide');
        guides.forEach(guide => guide.remove());
    }
    
    hideDropZones() {
        const dropZones = this.chart.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => zone.remove());
        this.hideAlignmentGuides();
    }
    
    getInsertionPoints(row, excludeId = -1) {
        const rowRects = this.rectangles.filter(r => r.row === row && r.id !== excludeId)
            .sort((a, b) => a.x - b.x);
        
        const points = [0];
        
        // Add end positions of entities in current row
        for (let i = 0; i < rowRects.length - 1; i++) {
            const currentRect = rowRects[i];
            points.push(currentRect.x + currentRect.width);
        }
        
        if (rowRects.length > 0) {
            const lastRect = rowRects[rowRects.length - 1];
            points.push(lastRect.x + lastRect.width);
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
                        buildTime: rect.entityData.build_time || rect.entityData.research_time || 0,
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
            
            // Send to export endpoint
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