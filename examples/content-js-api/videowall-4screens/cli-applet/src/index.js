require('./index.css');

import sos from '@signageos/front-applet';

// Wait on sos data are ready (https://sdk.docs.signageos.io/api/js/content/latest/js-applet-basics)
sos.onReady().then(async function () {
	const contentElement = document.getElementById('index');

	contentElement.innerHTML = '...syncing...';

	// Connect to the sync server and initialize the sync group TODO add docs link
	const syncServerUri = sos.config.sync_server || undefined;
	const syncGroup = sos.config.sync_group || undefined;
	await sos.sync.connect(syncServerUri);
	await sos.sync.init(syncGroup);

	contentElement.innerHTML = '...loading videos...';

	// Videos for the video wall are sliced in pre-production into separate segments, each segment for each device in the matrix
	const videosTopLeft = [{
		uid: 'video-1.mp4',
		uri: 'https://static.signageos.io/assets/videowall1/videowall1-top_left_0478fd10ebd4cdc9b888db783e0810ea.mp4'
	},
		{
			uid: 'video-2.mp4',
			uri: 'https://static.signageos.io/assets/videowall2/videowall2-top_left_def8f44d0dcac75b3b2474b705cb0f8e.mp4'
		},
		{
			uid: 'video-3.mp4',
			uri: 'https://static.signageos.io/assets/videowall3/videowall3-top_left_5c9b686dd52629562092d393c0180288.mp4'
		},
	];
	const videosTopRight = [{
		uid: 'video-1.mp4',
		uri: 'https://static.signageos.io/assets/videowall1/videowall1-top_right_3be4db1ded91836bb778c2fbd8810005.mp4'
	},
		{
			uid: 'video-2.mp4',
			uri: 'https://static.signageos.io/assets/videowall2/videowall2-top_right_588d44880144af36192b58ba42c18052.mp4'
		},
		{
			uid: 'video-3.mp4',
			uri: 'https://static.signageos.io/assets/videowall3/videowall3-top_right_09cf689c776ef65560de2115a46354db.mp4'
		},
	];
	const videosBottomLeft = [{
		uid: 'video-1.mp4',
		uri: 'https://static.signageos.io/assets/videowall1/videowall1-bottom_left_4e7c71fbb015ed9947e379f46daf941b.mp4'
	},
		{
			uid: 'video-2.mp4',
			uri: 'https://static.signageos.io/assets/videowall2/videowall2-bottom_left_cd0fe378929adffd4f85642bd70a7100.mp4'
		},
		{
			uid: 'video-3.mp4',
			uri: 'https://static.signageos.io/assets/videowall3/videowall3-bottom_left_d2fb186ee0716c13304867317db6e7dc.mp4'
		},
	];
	const videosBottomRight = [{
		uid: 'video-1.mp4',
		uri: 'https://static.signageos.io/assets/videowall1/videowall1-bottom_right_49db19005399d29d6872da2be7354208.mp4'
	},
		{
			uid: 'video-2.mp4',
			uri: 'https://static.signageos.io/assets/videowall2/videowall2-bottom_right_b0183cc35cb2c575546c9a63421db11a.mp4'
		},
		{
			uid: 'video-3.mp4',
			uri: 'https://static.signageos.io/assets/videowall3/videowall3-bottom_right_57a344c5675d5460c0f94065c3584212.mp4'
		},
	];

	// based on configuration choose the correct set of videos
	let videos;
	switch (sos.config.mode) {
		case 'top_left':
			videos = videosTopLeft;
			break;
		case 'top_right':
			videos = videosTopRight;
			break;
		case 'bottom_left':
			videos = videosBottomLeft;
			break;
		case 'bottom_right':
			videos = videosBottomRight;
			break;
		default:
			videos = videosTopLeft;
	}

	for (const video of videos) {
		// Store video to offline storage (https://sdk.docs.signageos.io/api/js/content/latest/js-offline-cache-media-files)
		const {
			filePath
		} = await sos.offline.cache.loadOrSaveFile(video.uid, video.uri);
		video.filePath = filePath;
		video.arguments = [video.filePath, 0, 0, document.documentElement.clientWidth, document.documentElement.clientHeight];
	}

	contentElement.innerHTML = '';

	let previousVideoIndex;
	let currentVideoIndex = 0;

	while (true) {
		const previousVideo = typeof previousVideoIndex === 'undefined' ? undefined : videos[previousVideoIndex];
		const currentVideo = videos[currentVideoIndex];

		const realCurrentVideoUid = await sos.sync.wait(currentVideo.uid, syncGroup);
		const realCurrentVideoIndex = videos.findIndex((video) => video.uid === realCurrentVideoUid);
		const realCurrentVideo = videos[realCurrentVideoIndex];

		// Videos are identificated by URI & coordination together (https://sdk.docs.signageos.io/api/js/content/latest/js-video)
		await sos.video.play(...realCurrentVideo.arguments);
		if (previousVideo) {
			await sos.video.stop(...previousVideo.arguments);
		}

		// https://sdk.docs.signageos.io/api/js/content/latest/js-video
		const endedPromise = sos.video.onceEnded(...realCurrentVideo.arguments);

		const nextVideoIndex = (realCurrentVideoIndex + 1) % videos.length;
		const nextVideo = videos[nextVideoIndex];
		await sos.video.prepare(...nextVideo.arguments);

		await endedPromise;

		previousVideoIndex = realCurrentVideoIndex;
		currentVideoIndex = nextVideoIndex;
	}

});
