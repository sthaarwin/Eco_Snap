// Simple K-Means implementation for finding mission clusters
// This can help adaptively group missions by their properties like priority and distance

export type Point = {
    id: string;
    features: number[]; // e.g., [normalizedDistance, normalizedPriority]
    originalData?: any;
};

export function kMeans(data: Point[], k: number, maxIterations: number = 100): Point[][] {
    if (data.length === 0) return [];
    if (data.length <= k) return [data];

    // 1. Initialize centroids randomly from data points
    let centroids = [...data].sort(() => 0.5 - Math.random()).slice(0, k).map(p => [...p.features]);
    let clusters: Point[][] = Array.from({ length: k }, () => []);

    let iterations = 0;
    let hasChanged = true;

    while (iterations < maxIterations && hasChanged) {
        // Clear clusters for this iteration
        clusters = Array.from({ length: k }, () => []);

        // 2. Assign each point to the closest centroid
        for (const point of data) {
            let minDistance = Infinity;
            let clusterIndex = 0;

            for (let i = 0; i < k; i++) {
                const distance = euclideanDistance(point.features, centroids[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    clusterIndex = i;
                }
            }
            clusters[clusterIndex].push(point);
        }

        // 3. Update centroids
        hasChanged = false;
        for (let i = 0; i < k; i++) {
            if (clusters[i].length === 0) continue; // Avoid empty clusters

            const newCentroid = calculateMean(clusters[i]);
            if (euclideanDistance(centroids[i], newCentroid) > 0.001) {
                centroids[i] = newCentroid;
                hasChanged = true;
            }
        }

        iterations++;
    }

    // Remove empty clusters
    return clusters.filter(cluster => cluster.length > 0);
}

function euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function calculateMean(cluster: Point[]): number[] {
    const numFeatures = cluster[0].features.length;
    const mean = new Array(numFeatures).fill(0);

    for (const point of cluster) {
        for (let i = 0; i < numFeatures; i++) {
            mean[i] += point.features[i];
        }
    }

    for (let i = 0; i < numFeatures; i++) {
        mean[i] /= cluster.length;
    }

    return mean;
}
