export interface User {
	publicId: string;
	email: string;
	username: string;
	isAdmin: boolean;
	accessServersArray: string[];
	accessPagesArray: string[];
}

export interface UsersResponse {
	success: boolean;
	users: User[];
}

export interface UpdateAccessResponse {
	success: boolean;
	message: string;
	user: {
		publicId: string;
		email: string;
		accessServersArray?: string[];
		accessPagesArray?: string[];
	};
}
