#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Window, Manager, WindowEvent};
use tauri::{LogicalSize, PhysicalPosition};
use walkdir::WalkDir;
use std::path::{Path, PathBuf};
use std::{env, fs, thread};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

#[derive(Clone, serde::Serialize)]
struct AppFoundPayload {
    name: String,
    path: String,
    keyword: String,
}

fn get_settings_path() -> Result<PathBuf, String> {
    let mut path = env::current_exe().map_err(|e| e.to_string())?;
    path.pop(); 
    path.push("settings.json");
    Ok(path)
}

#[tauri::command]
fn read_commands() -> Result<String, String> {
    let path = get_settings_path()?;
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_commands(data: String) -> Result<(), String> {
    let path = get_settings_path()?;
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn kill_process(exe_name: String) -> Result<(), String> {
    std::process::Command::new("taskkill").args(["/IM", &exe_name, "/F"]).status().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn launch_app(path: String) -> Result<bool, String> {
    std::process::Command::new(&path).spawn().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn launch_project(path: String) -> Result<bool, String> {
    let status = std::process::Command::new("cmd").args(["/C", "code", &path]).spawn();
    if status.is_err() {
        std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
fn set_taskbar_visible(window: Window, visible: bool) {
    let _ = window.set_skip_taskbar(!visible);
}

#[tauri::command]
fn start_full_scan(window: Window) {
    thread::spawn(move || {
        let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".to_string());
        
        let search_dirs = vec![
            "C:\\Program Files".to_string(), "C:\\Program Files (x86)".to_string(), "C:\\Riot Games".to_string(),
            "C:\\Epic Games".to_string(), "C:\\SteamLibrary\\steamapps\\common".to_string(),
            "D:\\SteamLibrary\\steamapps\\common".to_string(), "D:\\Riot Games".to_string(), "D:\\Epic Games".to_string(),
            "E:\\SteamLibrary\\steamapps\\common".to_string(), "E:\\Riot Games".to_string(), "E:\\Epic Games".to_string(),
            format!("{}\\AppData\\Local", user_profile), format!("{}\\AppData\\Roaming", user_profile), format!("{}\\Desktop", user_profile),
        ];

        let popular_apps = [
            "chrome", "firefox", "brave", "msedge", "opera", "discord", "spotify", "slack", "teams", "zoom", 
            "steam", "epicgames", "battlenet", "riotclient", "obs64", "vlc", "code", "notepad++", "gimp", "blender", 
            "photoshop", "illustrator", "premiere", "winword", "excel", "powerpnt", "outlook", "nvidia", "geforce", 
            "icue", "lghub", "synapse", "origin", "eadesktop", "minecraft", "roblox", "valorant", "league", "csgo", 
            "dota2", "overwatch", "apex", "wow", "hearthstone", "diablo", "cyberpunk", "gta5", "rdr2", "skyrim", 
            "doom", "7z", "winrar", "telegram", "whatsapp", "signal", "skype", "webex", "vivaldi", "gog", "uplay", 
            "battle", "streamlabs", "xsplit", "mpc", "potplayer", "itunes", "audacity", "visualstudio", "eclipse", 
            "intellij", "pycharm", "webstorm", "phpstorm", "clion", "rider", "androidstudio", "sublime", "atom", 
            "indesign", "lightroom", "aftereffects", "audition", "figma", "sketch", "maya", "3dsmax", "cinema4d", 
            "zbrush", "fusion360", "autocad", "solidworks", "inventor", "revit", "sketchup", "onenote", "access", 
            "publisher", "notion", "evernote", "dropbox", "onedrive", "icloud", "amd", "radeon", "corsair", 
            "logitech", "razer", "steelseries", "asus", "msi", "gigabyte", "postman", "docker", "vmware", "virtualbox",
            "git", "sourcetree", "filezilla", "putty", "winscp", "cyberduck", "anydesk", "teamviewer", "rustdesk", "obsidian"
        ];
        
        let junk_words = [
            "uninstall", "update", "crash", "helper", "setup", "install", "redist", "unins", "tool", "service", 
            "broker", "agent", "host", "server", "worker", "updater", "notifier", "renderer", "plugin", "subsystem", 
            "daemon", "background", "error", "util", "monitor", "manager", "sdk", "framework", "overlay", "reporter", 
            "bridge", "diagnostics", "feedback", "handler", "bootstrap", "sender", "extensions", "packager", "cef",
            "node", "cli", "compiler", "console", "debug", "test", "vshost", "awesomium", "subprocess", "mechanic"
        ];

        for dir in search_dirs {
            if !Path::new(&dir).exists() { continue; }
            for entry in WalkDir::new(&dir).max_depth(4).into_iter().filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "exe") {
                    let file_name = path.file_stem().unwrap().to_string_lossy().to_string();
                    let file_name_lower = file_name.to_lowercase();
                    
                    if junk_words.iter().any(|&j| file_name_lower.contains(j)) { continue; }
                    
                    let is_in_game_dir = path.to_string_lossy().to_lowercase().contains("steamapps") || 
                                         path.to_string_lossy().to_lowercase().contains("epic games") ||
                                         path.to_string_lossy().to_lowercase().contains("riot games");

                    if !popular_apps.iter().any(|&p| file_name_lower.contains(p)) && !is_in_game_dir { continue; }

                    let clean_keyword = file_name_lower.replace("64", "").replace("client", "").replace("launcher", "").replace("shipping", "");

                    let payload = AppFoundPayload {
                        name: file_name.clone(),
                        path: path.to_string_lossy().to_string(),
                        keyword: format!("open {}", clean_keyword.trim()),
                    };
                    let _ = window.emit("app-found", payload);
                }
            }
        }
        let _ = window.emit("scan-complete", ());
    });
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Exit Assistant", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Open Dashboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let mut tray = TrayIconBuilder::new().menu(&menu).tooltip("Assistant Pro");
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            
            tray.on_menu_event(|app, event| match event.id.as_ref() {
                "quit" => std::process::exit(0),
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_skip_taskbar(false);
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        let _ = window.emit("force-dashboard", ());
                    }
                }
                _ => {}
            })
            .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.emit("force-ghost", ());
                api.prevent_close();
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![start_full_scan, read_commands, save_commands, kill_process, launch_app, launch_project, set_taskbar_visible])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// create_voice_window removed — fallback handled in JS