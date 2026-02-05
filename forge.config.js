module.exports = {
  packagerConfig: {
    name: 'PMS Simulator',
    executableName: 'pms-simulator',
    icon: './icon',
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'pms_simulator',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
  ],
};
