const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform float uBass;
uniform float uTreble;
uniform float uSensitivity;
uniform float uSpeed;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float t = iTime * uSpeed;

    // Simple couleur qui change avec le temps
    vec3 col = vec3(
        0.5 + 0.5 * sin(t),
        0.5 + 0.5 * sin(t + 2.0),
        0.5 + 0.5 * sin(t + 4.0)
    );

    // Cercle au centre
    vec2 center = uv - 0.5;
    float d = length(center);
    col *= 1.0 - d;

    // Réaction audio
    col *= 1.0 + uBass * uSensitivity * 0.5;

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
