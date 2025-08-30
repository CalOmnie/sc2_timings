import matplotlib.pyplot as plt
import matplotlib.patches as patches
from datetime import datetime, timedelta
import json

# Load building data
with open('terran_buildings_data.json', 'r') as f:
    buildings_data = json.load(f)

# Research data (from Liquipedia)
research_data = {
    "stimpack": {
        "name": "Stimpack (Combat Shield)",
        "build_time": 79,
        "minerals": 100,
        "gas": 100,
        "requires": "Tech Lab + Barracks"
    }
}

def create_gantt_chart():
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    
    # Define tasks with their dependencies
    tasks = []
    current_time = 0
    
    # Task 1: Build Barracks
    barracks_data = buildings_data["barracks"]
    barracks_start = current_time
    barracks_end = current_time + barracks_data["build_time"]
    tasks.append({
        "name": "Build Barracks",
        "start": barracks_start,
        "duration": barracks_data["build_time"],
        "cost": f"{barracks_data['minerals']}m {barracks_data['gas']}g",
        "color": "#4CAF50"
    })
    current_time = barracks_end
    
    # Task 2: Build Tech Lab (can start after Barracks is complete)
    tech_lab_data = buildings_data["tech"]
    tech_lab_start = current_time
    tech_lab_end = current_time + tech_lab_data["build_time"]
    tasks.append({
        "name": "Build Tech Lab",
        "start": tech_lab_start,
        "duration": tech_lab_data["build_time"],
        "cost": f"{tech_lab_data['minerals']}m {tech_lab_data['gas']}g",
        "color": "#2196F3"
    })
    current_time = tech_lab_end
    
    # Task 3: Research Stimpack (can start after Tech Lab is complete)
    stimpack_data = research_data["stimpack"]
    stimpack_start = current_time
    stimpack_end = current_time + stimpack_data["build_time"]
    tasks.append({
        "name": "Research Stimpack",
        "start": stimpack_start,
        "duration": stimpack_data["build_time"],
        "cost": f"{stimpack_data['minerals']}m {stimpack_data['gas']}g",
        "color": "#FF9800"
    })
    
    # Create the Gantt chart
    y_pos = range(len(tasks))
    
    for i, task in enumerate(tasks):
        # Draw the task bar
        bar = ax.barh(i, task["duration"], left=task["start"], 
                     color=task["color"], alpha=0.7, edgecolor='black')
        
        # Add task name and duration text
        ax.text(task["start"] + task["duration"]/2, i, 
               f"{task['name']}\n{task['duration']}s\n{task['cost']}", 
               ha='center', va='center', fontweight='bold', fontsize=9)
    
    # Customize the chart
    ax.set_yticks(y_pos)
    ax.set_yticklabels([task["name"] for task in tasks])
    ax.invert_yaxis()
    
    ax.set_xlabel('Time (seconds)', fontsize=12)
    ax.set_title('StarCraft 2 Terran Build Order: Barracks → Tech Lab → Stimpack Research', 
                fontsize=14, fontweight='bold', pad=20)
    
    # Add total time annotation
    total_time = tasks[-1]["start"] + tasks[-1]["duration"]
    ax.text(total_time/2, len(tasks), f'Total Time: {total_time} seconds', 
           ha='center', va='center', fontsize=12, fontweight='bold',
           bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray"))
    
    # Add grid for better readability
    ax.grid(True, axis='x', alpha=0.3)
    ax.set_xlim(0, total_time + 10)
    
    # Add cost summary
    total_minerals = barracks_data["minerals"] + tech_lab_data["minerals"] + stimpack_data["minerals"]
    total_gas = barracks_data["gas"] + tech_lab_data["gas"] + stimpack_data["gas"]
    
    cost_text = f"Total Cost: {total_minerals} Minerals, {total_gas} Gas"
    ax.text(0.02, 0.98, cost_text, transform=ax.transAxes, fontsize=11, 
           verticalalignment='top', bbox=dict(boxstyle="round,pad=0.3", facecolor="lightyellow"))
    
    plt.tight_layout()
    plt.savefig('sc2_gantt_chart.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("Gantt chart saved as 'sc2_gantt_chart.png'")
    print(f"Build Order Summary:")
    print(f"1. Build Barracks: {barracks_data['build_time']}s ({barracks_data['minerals']}m {barracks_data['gas']}g)")
    print(f"2. Build Tech Lab: {tech_lab_data['build_time']}s ({tech_lab_data['minerals']}m {tech_lab_data['gas']}g)")
    print(f"3. Research Stimpack: {stimpack_data['build_time']}s ({stimpack_data['minerals']}m {stimpack_data['gas']}g)")
    print(f"Total Time: {total_time} seconds")
    print(f"Total Cost: {total_minerals} Minerals, {total_gas} Gas")

if __name__ == "__main__":
    create_gantt_chart()