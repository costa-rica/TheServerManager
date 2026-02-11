import React from "react";

export default function SidebarWidget() {
	return (
		<div
			className={`
        mx-auto w-full px-2 py-2 text-center`}
		>
			<p className="text-[10px] leading-tight text-gray-400 dark:text-gray-600">
				Icons by{" "}
				<a
					href="https://www.flaticon.com/free-icons/new"
					target="_blank"
					rel="nofollow"
					className="underline hover:text-brand-500 dark:hover:text-brand-400"
				>
					Pixel perfect - Flaticon
				</a>
			</p>
		</div>
	);
}
