module.exports = {
    apps: [{
        name: "Winnies",
        script: "Run.js",
        instances: 1,
        exec_mode: "fork",
        watch: true,
        ignore_watch: [
            "node_modules"
        ],
        max_memory_restart: "500M",
        log_date_format: "HH:mm:ss DD-MM-YYYY",
        merge_logs: true,
        autorestart: true,
        restart_delay: 6969
    }]
};
