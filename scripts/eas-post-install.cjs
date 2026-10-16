if (['production','testflight'].includes(process.env.EAS_BUILD_PROFILE)) require('./verify-release.cjs');
