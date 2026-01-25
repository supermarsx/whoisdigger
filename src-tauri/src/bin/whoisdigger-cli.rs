use clap::{Parser, Subcommand, ValueEnum};
use whoisdigger::{perform_lookup, dns_lookup, rdap_lookup, availability::is_domain_available, db_history_get, db_cache_set, db_cache_get};
use indicatif::{ProgressBar, ProgressStyle};
use tokio::sync::Semaphore;
use std::sync::Arc;
use futures::future::join_all;
use std::path::PathBuf;

#[derive(ValueEnum, Clone, Debug)]
enum LookupType {
    Whois,
    Dns,
    Rdap,
}

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Lookup a single domain or wordlist
    Lookup {
        /// Domain to lookup
        #[arg(short, long)]
        domain: Option<String>,

        /// Wordlist file path for bulk lookup
        #[arg(short, long)]
        wordlist: Option<String>,

        /// TLDs to append to wordlist entries (comma separated)
        #[arg(short, long, default_value = "com,net,org")]
        tlds: String,

        /// Number of concurrent lookups
        #[arg(short, long, default_value_t = 5)]
        concurrency: usize,

        /// Timeout in milliseconds
        #[arg(short, long, default_value_t = 5000)]
        timeout: u64,

        /// Type of lookup to perform
        #[arg(short, long, value_enum, default_value_t = LookupType::Whois)]
        lookup_type: LookupType,
    },
    /// View lookup history
    History {
        /// Path to history database
        #[arg(short, long, default_value = "history.sqlite")]
        path: String,
        /// Number of entries to show
        #[arg(short, long, default_value_t = 20)]
        limit: u32,
    },
    /// Manage request cache
    Cache {
        /// Path to cache database
        #[arg(short, long, default_value = "cache.sqlite")]
        path: String,
        /// Clear the entire cache
        #[arg(long)]
        clear: bool,
    }
}

#[tokio::main] async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Lookup { domain, wordlist, tlds, concurrency, timeout, lookup_type } => {
            if let Some(dom) = domain {
                process_single(&dom, timeout, &lookup_type).await?;
            } else if let Some(path) = wordlist {
                process_bulk(&path, &tlds, concurrency, timeout, &lookup_type).await?;
            }
        },
        Commands::History { path, limit } => {
            let entries = db_history_get(&path, limit).map_err(|e| anyhow::anyhow!(e))?;
            println!("{:<30} | {:<15} | {:<20}", "Domain", "Status", "Timestamp");
            println!("{:-<30}-|-{:-<15}-|-{:-<20}", "", "", "");
            for e in entries {
                println!("{:<30} | {:<15} | {:<20}", e.domain, e.status, e.timestamp);
            }
        },
        Commands::Cache { path, clear } => {
            if clear {
                let conn = rusqlite::Connection::open(path)?;
                conn.execute("DELETE FROM cache", [])?;
                println!("Cache cleared.");
            }
        }
    }

    Ok(())
}

async fn process_single(domain: &str, timeout: u64, lookup_type: &LookupType) -> anyhow::Result<()> {
    println!("Looking up {} using {:?}...", domain, lookup_type);
    match lookup_type {
        LookupType::Whois => {
            match perform_lookup(domain, timeout).await {
                Ok(res) => {
                    println!("Status: {:?}", is_domain_available(&res));
                    println!("---\n{}\n---", res);
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        LookupType::Dns => {
            match dns_lookup(domain).await {
                Ok(exists) => println!("NS Records found: {}", exists),
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        LookupType::Rdap => {
            match rdap_lookup(domain).await {
                Ok(res) => println!("---\n{}\n---", res),
                Err(e) => eprintln!("Error: {}", e),
            }
        }
    }
    Ok(())
}

async fn process_bulk(path: &str, tlds_str: &str, concurrency: usize, timeout: u64, lookup_type: &LookupType) -> anyhow::Result<()> {
    let content = std::fs::read_to_string(path)?;
    let lines: Vec<String> = content.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
    let tlds: Vec<&str> = tlds_str.split(',').collect();
    
    let mut domains = Vec::new();
            for line in lines {
                for tld in &tlds {
                    domains.push(format!("{}.{}", line, tld));
                }
            }
    println!("Starting bulk lookup for {} domains (concurrency: {}, type: {:?})...", 
        domains.len(), concurrency, lookup_type);
    
    let pb = ProgressBar::new(domains.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")?
        .progress_chars("#>- "));

    let semaphore = Arc::new(Semaphore::new(concurrency));
    let mut tasks = Vec::new();

    for domain in domains {
        let sem = Arc::clone(&semaphore);
        let t = timeout;
        let lt = lookup_type.clone();
        let pb_clone = pb.clone();
        
        tasks.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            let res = match lt {
                LookupType::Whois => perform_lookup(&domain, t).await.map(|_| "Whois success".to_string()),
                LookupType::Dns => dns_lookup(&domain).await.map(|b| if b { "NS found".to_string() } else { "No NS".to_string() }),
                LookupType::Rdap => rdap_lookup(&domain).await.map(|_| "Rdap success".to_string()),
            };
            pb_clone.inc(1);
            (domain, res)
        }));
    }

    let results = join_all(tasks).await;
    pb.finish_with_message("Done");

    println!("\nSummary:");
    for r in results {
        let (dom, res) = r?;
        let status = match res {
            Ok(s) => s,
            Err(e) => format!("Error: {}", e),
        };
        println!("{}: {}", dom, status);
    }
    Ok(())
}
