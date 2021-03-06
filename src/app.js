const { Conf, Ender, plugins } = require('..');
const { PermissionLevels } = require('klasa');

const conf = new Conf();

const app = {
	commandLogging: conf.get('ENDER_BOT_LOG_LEVEL') >= 1,
	console: {
		// colors: {
		//     debug: { type: 'log', message: '', time: '' },
		//     error: { type: 'error', message: '', time: '' },
		//     log: { type: 'log', message: '', time: '' },
		//     verbose: { type: 'log', message: '', time: '' },
		//     warn: { type: 'warn', message: '', time: '' },
		//     wtf: { type: 'error', message: '', time: '' }
		// },
		stderr: process.stderr,
		stdout: process.stdout,
		timestamps: conf.get('FORMAT_DATETIME'),
		useColor: true,
		utc: false
	},
	consoleEvents: {
		debug: conf.get('LOG_LEVEL') >= 4,
		error: conf.get('LOG_LEVEL') >= 0,
		log: conf.get('LOG_LEVEL') >= 3,
		verbose: conf.get('LOG_LEVEL') >= 5,
		warn: conf.get('LOG_LEVEL') >= 2,
		wtf: conf.get('LOG_LEVEL') >= 1
	},
	disabledEvents: [ 'TYPING_START' ],
	fetchAllMembers: true,
	messageLogging: conf.get('ENDER_BOT_LOG_LEVEL') >= 2,
	permissionLevels: new PermissionLevels(50 + 1)
		.add(0, () => true)
		.add(5, ({ guild, member }) => guild && member.permissions.has('MANAGE_MESSAGES'), { fetch: true })
		.add(10, ({ guild, member }) => guild && (member.permissions.has('BAN_MEMBERS') || member.permissions.has('KICK_MEMBERS')), { fetch: true })
		.add(11, ({ guild, member }) => guild && member.roles.get(guild.settings.get('options.roles.moderator')), { fetch: true })
		.add(20, ({ guild, member }) => guild && member.permissions.has('MANAGE_GUILD'), { fetch: true })
		.add(25, ({ guild, member }) => guild && member.permissions.has('ADMINISTRATOR'), { fetch: true })
		.add(30, ({ guild, author }) => guild && guild.owner === author, { fetch: true })
		.add(40, ({ client, author }) => client.owners.has(author), { break: true })
		.add(50, ({ client, author }) => client.owners.has(author)),
	prefix: conf.get('ENDER_BOT_PREFIX'),
	production: conf.get('PRODUCTION'),
	settings: {
		gateways: {
			clientStorage: {
				provider: undefined,
				schema: require('./schemas/client.js')
			},
			guilds: {
				provider: undefined,
				schema: require('./schemas/guilds.js')
			},
			users: {
				provider: undefined,
				schema: require('./schemas/users.js')
			}
		}
	},
	shardCount: conf.get('BOT_SHARDS'),

	adminOnly: conf.get('ADMIN_ONLY'),
	server: {
		port: conf.get('ENDER_SERVER_PORT'),
		session: { secret: conf.get('ENDER_SERVER_SESSION_SECRET') }
	}
};

(async () => {
	const pl = await gatherPlugins();

	for (const plugin of pl) {
		if (!plugin.name) continue;
		if (!plugin.description || !plugin.version) continue;

		if (!plugins[plugin.name]) continue;
		Ender.use(require(plugin.dir), plugin);
	}

	const App = new Ender(app);

	App.init();
	App.start({ token: conf.get('DISCORD_TOKEN') });
})();



async function gatherPlugins() {
	const plugins = [];

	const { join, parse } = require('path');
	const { readJSON, scan } = require('fs-nextra');

	const plInfo = await scan(join(__dirname, '..', 'plugins'), { depthLimit: 2, filter: (stats, dir) => {
		const file = parse(dir);
		return stats.isFile() && file.base === 'plugin.json' && file.ext === '.json' && file.name === 'plugin';
	} });
	const pl = plInfo.keys();

	for (const p of pl) {
		// eslint-disable-next-line no-await-in-loop
		plugins.push({ ...await readJSON(p), dir: parse(p).dir });
	}

	return plugins;
}

