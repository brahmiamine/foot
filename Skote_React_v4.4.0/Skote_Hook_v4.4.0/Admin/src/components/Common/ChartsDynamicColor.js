const getChartColorsArray = (colors) => {
    if (!colors) return [];

    try {
        colors = JSON.parse(colors);
    } catch (error) {
        console.error("Error parsing colors:", error);
        return [];
    }

    if (!Array.isArray(colors)) {
        console.error("Colors is not an array");
        return [];
    }

    return colors.map(function (value) {
        var newValue = value.replace(/\s/g, ""); // Remove all whitespace

        if (newValue.indexOf(",") === -1) {
            var color = getComputedStyle(document.documentElement).getPropertyValue(newValue);

            if (color) {
                color = color.replace(/\s/g, ""); // Remove all whitespace
                return color.indexOf("#") !== -1 ? color : color || newValue;
            }
            return newValue;
        } else {
            var val = value.split(',');
            if (val.length === 2) {
                var rgbaColor = getComputedStyle(document.documentElement).getPropertyValue(val[0]);
                if (rgbaColor) {
                    rgbaColor = "rgba(" + rgbaColor + "," + val[1] + ")";
                    return rgbaColor;
                }
            }
            return newValue;
        }
    });
};

export default getChartColorsArray;