export interface Pm2App {
	name: string;
	pm_id: number;
	status: string; // "online", "stopped", "errored", etc.
	cpu: number;
	memory: number;
	uptime: number;
	restarts: number;
	script: string;
	exec_mode: string;
	instances: number;
	pid: number;
	version: string;
	node_version: string;
	port: number | null;
}

export interface Pm2AppsResponse {
	managedAppsArray: Pm2App[];
}
