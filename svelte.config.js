import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Node.js szerver adapter: tartósan futó folyamat kell a node-cron ütemezett feladataihoz
		// (óránkénti hírelemzés, hajnali takarítás), ezért serverless adapter nem használható.
		adapter: adapter()
	}
};

export default config;
