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
        this.loadSC2Data();
    }
    
    init() {
        document.getElementById('addRow').addEventListener('click', () => this.addRow());
        
        // Race button handlers
        document.querySelectorAll('.race-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.onRaceSelect(e.target.dataset.race));
        });
        
        // Type button handlers  
        document.querySelectorAll('.type-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.onTypeSelect(e.target.dataset.type));
        });
        
        this.chart.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.chart.addEventListener('wheel', (e) => this.handleWheel(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
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
        // Update race button states
        document.querySelectorAll('.race-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.race === race);
        });
        
        this.selectedRace = race;
        this.searchTerm = ''; // Clear search when race changes
        const searchInput = document.getElementById('entitySearch');
        if (searchInput) searchInput.value = '';
        this.updateEntityPalette();
    }
    
    onTypeSelect(type) {
        // Update type button states
        document.querySelectorAll('.type-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
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
        
        this.rectangles.push(rectData);
        this.positionRectangle(rectData);
        this.updateRowStats(lastRowIndex);
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
    }
    
    createGridLines() {
        const gridLines = document.getElementById('gridLines');
        gridLines.innerHTML = '';
        
        const chartWidth = this.chart.clientWidth;
        
        for (let x = 0; x <= chartWidth; x += this.gridSize) {
            const line = document.createElement('div');
            line.className = 'grid-line';
            line.style.left = x + 'px';
            gridLines.appendChild(line);
        }
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
}

window.addEventListener('load', () => {
    window.ganttChart = new GanttChart();
});

window.addEventListener('resize', () => {
    if (window.ganttChart) {
        window.ganttChart.createGridLines();
    }
});