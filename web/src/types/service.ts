export interface Service {
	name: string;
	filename: string;
	loaded: string;
	active: string;
	status: string;
	onStartStatus: string;
	timerLoaded?: string;
	timerActive?: string;
	timerStatus?: string;
	timerOnStartStatus?: string;
	timerTrigger?: string;
}

export interface ServicesResponse {
	servicesStatusArray: Service[];
}
