import { BuildVersion } from '@totvs/tds-languageclient';
import { customElement, html, LitElement } from 'lit-element';
import { style } from '../css/monitor-app.css';
import { MonitorServerItemOptions } from './monitor-server-item';

const DEFAULT_SETTINGS: MonitorSettings = {
	servers: [],
	config: {
		updateInterval: 0,
		language: "portuguese",
		alwaysOnTop: false,
		generateUpdateLog: false,
		generateExecutionLog: false
	}
};

export interface MonitorSettings {
	servers?: Array<Server>;
	config?: MonitorSettingsConfig
}

export interface MonitorSettingsConfig {
	language?: 'portuguese' | 'english' | 'spanish';
	updateInterval?: number;
	alwaysOnTop?: boolean;
	generateUpdateLog?: boolean;
	generateExecutionLog?: boolean;
}

interface Server {
	name: string;
	address: string;
	port: number;
	build: BuildVersion;
	token?: string;
}


export enum MessageType {
	ERROR = 1,
	WARNING = 2,
	INFO = 3,
	LOG = 4
}

interface WindowLogMessage {
	type: MessageType;
	message: string;
}

@customElement('monitor-app')
class MonitorApp extends LitElement {

	private _settings: MonitorSettings = DEFAULT_SETTINGS;

	constructor() {
		super();

		this.addEventListener('server-connected', this.onServerConnected);
		this.addEventListener('server-init', this.onBeginServerConnection);
		this.addEventListener('server-error', this.onServerError);
		this.addEventListener('settings-update', this.onSettingsUpdate);

		const serverView = this.querySelector('monitor-server-view');

		languageClient.on('window/logMessage', (data: WindowLogMessage) => {
			serverView.log(data.message, data.type);
		});
	}

	get settings(): MonitorSettings {
		return this._settings;
	}

	set settings(settings: MonitorSettings) {
		this._settings = Object.assign({}, DEFAULT_SETTINGS, settings);

		let drawer = this.querySelector('monitor-drawer');

		this.settings.servers.forEach((data) => {
			let server = this.createServer(data);

			drawer.addServer({ name: data.name, server });
		});
	}

	get version(): string {
		return window.versions.main;
	}

	get dependencies(): Partial<Versions> {
		return {
			'@totvs/tds-languageclient': window.versions['@totvs/tds-languageclient'],
			'@totvs/tds-monitor-frontend': window.versions['@totvs/tds-monitor-frontend']
		};
	}

	static get styles() {
		return style;
	}

	render() {
		return html`
			<slot></slot>
    	`;
	}

	private createServer(data: Server) {
		let server = languageClient.createMonitorServer();
		server.id = data.name;
		server.address = data.address;
		server.port = data.port;

		if (data.build) {
			server.build = data.build;
		}

		if (data.token) {
			server.token = data.token;
		}

		return server;
	}

	addServer(options: MonitorServerItemOptions) {
		this.settings.servers.push({
			name: options.name,
			address: options.server.address,
			port: options.server.port,
			build: options.server.build
		});
		window.localStorage.setItem('settings', JSON.stringify(this.settings));

		let drawer = this.querySelector('monitor-drawer');
		drawer.addServer(options);
	}

	removeServer(serverName: string) {
		this.settings.servers = this.settings.servers.filter((server => server.name !== serverName));
		window.localStorage.setItem('settings', JSON.stringify(this.settings));

		let drawer = this.querySelector('monitor-drawer');
		drawer.removeServer(serverName);
	}

	storeConnectionToken(serverName: string, token: string) {
		let server = this.settings.servers.find((server) => server.name === serverName);

		if (server) {
			server.token = token;

			window.localStorage.setItem('settings', JSON.stringify(this.settings));
		}
	}

	get config(): MonitorSettingsConfig {
		return this.settings.config;
	}

	set config(value: MonitorSettingsConfig) {
		this.settings.config = value;

		window.localStorage.setItem('settings', JSON.stringify(this.settings));
	}

	onBeginServerConnection(event: CustomEvent<MonitorServerItemOptions>): boolean | void {
		let serverView = this.querySelector('monitor-server-view');

		serverView.users = [];
		serverView.name = event.detail.name;
		serverView.server = event.detail.server;
		serverView.status = 'connecting';

		console.log('begin connnection to server ' + event.detail);
	}

	onServerConnected(event: CustomEvent<MonitorServerItemOptions>): boolean | void {
		let serverView = this.querySelector('monitor-server-view');

		serverView.users = event.detail.users;
		serverView.name = event.detail.name;
		serverView.server = event.detail.server;
		serverView.status = 'connected';

		console.log('onConnected', event.detail);
	}

	onServerError(event: CustomEvent<string>): boolean | void {
		let serverView = this.querySelector('monitor-server-view');

		serverView.users = [];
		serverView.error = event.detail; //'Não foi possivel conectar!';
		serverView.status = 'error';
	}

	onSettingsUpdate(event: CustomEvent<string>): boolean | void {
		let serverView = this.querySelector('monitor-server-view');

		serverView.setServerUpdateInterval();

		console.log('onSettingsUpdate');
	}

}

declare global {
	interface HTMLElementTagNameMap {
		'monitor-app': MonitorApp;
	}
}
