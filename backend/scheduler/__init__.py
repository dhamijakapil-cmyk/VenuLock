"""
Scheduler package for background tasks.

Usage:
    from scheduler import start_all_tasks, is_scheduler_enabled
    
    # In startup:
    tasks = await start_all_tasks()
    
Configuration:
    ENABLE_SCHEDULER=true  # Enable scheduler (default: false)
    
Multi-Worker Safety:
    Uses MongoDB distributed locks to prevent duplicate execution.
    Safe for Gunicorn with multiple workers or Kubernetes replicas.
"""
from scheduler.tasks import (
    start_all_tasks, 
    is_scheduler_enabled,
    sla_monitor_loop, 
    weekly_digest_loop, 
    admin_conversion_email_loop
)

__all__ = [
    "start_all_tasks", 
    "is_scheduler_enabled",
    "sla_monitor_loop", 
    "weekly_digest_loop", 
    "admin_conversion_email_loop"
]
