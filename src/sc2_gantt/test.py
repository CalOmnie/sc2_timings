import dash
from dash import dcc, html
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from PIL import Image

tasks = [
    dict(Task="Build Barracks",Category="T1", Start=0, Finish=46, Img="https://images.plot.ly/language-icons/api-home/python-logo.png"),
    dict(Task="Build Tech Lab", Category="T1", Start=46, Finish=71, Img="https://images.plot.ly/language-icons/api-home/python-logo.png"),
    dict(Task="Research Stimpack", Category="T1", Start=71, Finish=192, Img="https://images.plot.ly/language-icons/api-home/python-logo.png"),
]

# Build DataFrame
df = pd.DataFrame(tasks)
baseline = pd.Timestamp("2023-01-01")

df["Start_dt"] = baseline + pd.to_timedelta(df["Start"], unit="s")
df["Finish_dt"] = baseline + pd.to_timedelta(df["Finish"], unit="s")
df["Mid_dt"] = df["Start_dt"] + (df["Finish_dt"] - df["Start_dt"]) / 2
print(df["Mid_dt"])
# df["Category"] = "Timeline"  # Single row

# Create timeline
fig = px.timeline(
    df,
    x_start="Start_dt",
    x_end="Finish_dt",
    y="Category",
    color="Category",
)

fig.update_yaxes(autorange="reversed", showticklabels=False)
fig.update_layout(
    title="SC2: Barracks to Stimpack Timeline with Images",
    xaxis_title="Time (mm:ss)",
    yaxis_title="",
    xaxis=dict(
        tickformat="%M:%S",
        tickvals=[baseline + pd.Timedelta(seconds=s) for s in range(0, 201, 20)],
    ),
    showlegend=False,
    margin=dict(l=60, r=40, t=60, b=40),
)

# Add text labels on bars
for _, row in df.iterrows():
    fig.add_trace(
        go.Scatter(
            x=[row["Mid_dt"]],
            y=[row["Category"]],
            text=[row["Task"]],
            mode="text",
            textfont=dict(color="white", size=12),
            showlegend=False,
        )
    )

min_time = df["Start_dt"].min()
max_time = df["Finish_dt"].max()

def normalize_time(time):
    return (time - min_time) / (max_time - min_time)

# Add image icons on bars
for _, row in df.iterrows():
    print(normalize_time(row["Mid_dt"]))
    fig.add_layout_image(
        dict(
            source=Image.open("static/icons/barracks.jpg"),
            x=[row["Mid_dt"]],
            y=[row["Category"]],  # Y=0 corresponds to first (and only) row in reversed y-axis
            xref="x",
            yref="y",  # paper goes from 0 (bottom) to 1 (top)
            xanchor="center",
            yanchor="middle",
            sizex=(row["Finish_dt"].timestamp() - row["Start_dt"].timestamp()) * 5000,
            sizey=0.5,
            sizing="contain",
            opacity=1.,
            layer="above",
        )
    )

fig.add_layout_image(
    dict(
        source=Image.open("static/icons/barracks.jpg"),
        xref="paper", yref="paper",
        x=1, y=1.05,
        sizex=0.2, sizey=0.2,
        xanchor="right", yanchor="bottom"
    )
)

fig.add_layout_image(
        dict(
            source="https://images.plot.ly/language-icons/api-home/python-logo.png",
            xref="x",
            yref="y",
            x=0,
            y=3,
            sizex=2,
            sizey=2,
            sizing="stretch",
            opacity=0.5,
            layer="above")
)

# Dash app
app = dash.Dash(__name__)

app.layout = html.Div(
    [
        html.H1("StarCraft 2: Timeline with Images"),
        dcc.Graph(figure=fig),
    ]
)


if __name__ == "__main__":
    app.run(debug=True)
