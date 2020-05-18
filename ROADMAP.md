1. Startup: we use the config.json file format.
2. Network connectivity: we need one `tap` device per Firecracker instance.
3. We have to figure out how to properly resize the image.
4. Place the command inside the `.profile` file in the `root` user's home 
directory. We append `reboot` to make sure Firecracker exits.