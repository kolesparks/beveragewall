


export function createRateLimit(config: { limit: number; windowSeconds: number }) {


    let limit = config.limit;

    setInterval(() => {
        limit = config.limit;
    }, 1000 * config.windowSeconds)

    return () => {
        if (limit <= 0) {
            return true;
        }

        limit--;

        return false;
    }

}