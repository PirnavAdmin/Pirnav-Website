using System;
using Microsoft.EntityFrameworkCore;

namespace Pirnav.API.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }


public AppDbContext(DbContextOptions<AppDbContext> options)
    : base(options)
    {
    }

    public virtual DbSet<AdminUser> AdminUsers { get; set; }

    public virtual DbSet<ContactMessage> ContactMessages { get; set; }

    public virtual DbSet<Job> Jobs { get; set; }

    public virtual DbSet<JobApplication> JobApplications { get; set; }

    public virtual DbSet<Service> Services { get; set; }

    public virtual DbSet<Interview> Interviews { get; set; }

    public DbSet<Manager> Managers { get; set; }

    public DbSet<Lead> Leads { get; set; }

    public DbSet<DemoRequest> DemoRequests { get; set; }

    public DbSet<EmailOutbox> EmailOutboxes { get; set; }

    public DbSet<DemoActivity> DemoActivities { get; set; }

    public DbSet<InterviewFeedback> InterviewFeedbacks { get; set; }

    public DbSet<ChatLog> ChatLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdminUser>().ToTable("AdminUsers");

        modelBuilder.Entity<ContactMessage>().ToTable("ContactMessages");

        modelBuilder.Entity<Job>().ToTable("Jobs");

        modelBuilder.Entity<JobApplication>().ToTable("JobApplications");

        modelBuilder.Entity<Service>().ToTable("Services");

        modelBuilder.Entity<Interview>().ToTable("Interviews");

        modelBuilder.Entity<Manager>().ToTable("Managers");

        modelBuilder.Entity<Lead>().ToTable("Leads");

        modelBuilder.Entity<DemoRequest>().ToTable("DemoRequests");

        modelBuilder.Entity<EmailOutbox>().ToTable("EmailOutbox");

        modelBuilder.Entity<DemoActivity>().ToTable("DemoActivities");

        modelBuilder.Entity<InterviewFeedback>().ToTable("InterviewFeedbacks");

        modelBuilder.Entity<ChatLog>().ToTable("ChatLogs");

        // =======================
        // ADMIN USERS
        // =======================

        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Username)
                .HasMaxLength(100);

            entity.Property(e => e.Email)
                .HasMaxLength(150);

            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255);

            entity.Property(e => e.Role)
                .HasMaxLength(50);

            entity.Property(e => e.CreatedDate)
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // =======================
        // CONTACT MESSAGES
        // =======================

        modelBuilder.Entity<ContactMessage>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name)
                .HasMaxLength(150);

            entity.Property(e => e.Email)
                .HasMaxLength(150);

            entity.Property(e => e.Subject)
                .HasMaxLength(200);

            entity.Property(e => e.CreatedDate)
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // =======================
        // JOBS
        // =======================

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.CreatedDate)
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);

            entity.Property(e => e.JobTitle)
                .HasMaxLength(500);

            entity.Property(e => e.WorkLocation)
                .HasMaxLength(300);

            entity.Property(e => e.JobType)
                .HasMaxLength(200);

            entity.Property(e => e.Status)
                .HasMaxLength(100);

            entity.Property(e => e.Experience)
                .HasMaxLength(200);

            entity.Property(e => e.CTC)
                .HasMaxLength(200);

            entity.Property(e => e.HighestQualification)
                .HasMaxLength(300);

            entity.Property(e => e.JobDescription)
                .HasColumnType("longtext");

            entity.Property(e => e.MandatorySkills)
                .HasColumnType("longtext");
        });

        // =======================
        // JOB APPLICATIONS
        // =======================

        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name)
                .HasMaxLength(150);

            entity.Property(e => e.Email)
                .HasMaxLength(150);

            entity.Property(e => e.ResumePath)
                .HasMaxLength(300);

            entity.Property(e => e.AppliedDate)
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => new { e.JobId, e.Email })
                .IsUnique();

            entity.HasOne(d => d.Job)
                .WithMany(p => p.JobApplications)
                .HasForeignKey(d => d.JobId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =======================
        // SERVICES
        // =======================

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Title)
                .HasMaxLength(200);

            entity.Property(e => e.Icon)
                .HasMaxLength(200);

            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);

            entity.Property(e => e.CreatedDate)
                .HasColumnType("datetime")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // =======================
        // INTERVIEW STATUS ENUM
        // =======================

        modelBuilder.Entity<Interview>()
            .Property(i => i.Status)
            .HasConversion<string>();

        // =======================
        // PERFORMANCE INDEXES
        // =======================

        modelBuilder.Entity<ChatLog>()
            .HasIndex(x => x.SessionId);

        modelBuilder.Entity<ChatLog>()
            .HasIndex(x => x.CreatedDate);

        modelBuilder.Entity<Lead>()
            .HasIndex(x => x.Email);

        modelBuilder.Entity<ContactMessage>()
            .HasIndex(x => x.Email);

        modelBuilder.Entity<JobApplication>()
            .HasIndex(x => x.AppliedDate);

        modelBuilder.Entity<Job>()
            .HasIndex(x => x.IsActive);

        // =======================
        // DEMO REQUESTS / OUTBOX / ACTIVITIES
        // =======================

        modelBuilder.Entity<DemoRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReferenceNumber).HasMaxLength(40);
            entity.Property(e => e.ProductId).HasMaxLength(64);
            entity.Property(e => e.ProductName).HasMaxLength(150);
            entity.Property(e => e.Name).HasMaxLength(150);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.Phone).HasMaxLength(30);
            entity.Property(e => e.Company).HasMaxLength(150);
            entity.Property(e => e.Message).HasColumnType("longtext");
            entity.Property(e => e.Status).HasMaxLength(40).HasDefaultValue("New");
            entity.HasIndex(e => e.ReferenceNumber).IsUnique();
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.AssignedToUser)
                .WithMany()
                .HasForeignKey(e => e.AssignedToUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<EmailOutbox>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EmailType).HasMaxLength(50);
            entity.Property(e => e.RecipientEmail).HasMaxLength(150);
            entity.Property(e => e.SenderEmail).HasMaxLength(150);
            entity.Property(e => e.SenderName).HasMaxLength(150);
            entity.Property(e => e.Subject).HasMaxLength(250);
            entity.Property(e => e.HtmlBody).HasColumnType("longtext");
            entity.Property(e => e.TextBody).HasColumnType("longtext");
            entity.Property(e => e.DeliveryStatus).HasMaxLength(30).HasDefaultValue("Pending");
            entity.Property(e => e.LastError).HasMaxLength(500);
            entity.HasIndex(e => new { e.DeliveryStatus, e.NextRetryAt });
            entity.HasOne(e => e.RelatedDemoRequest)
                .WithMany(d => d.OutboxEmails)
                .HasForeignKey(e => e.RelatedDemoRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DemoActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActivityType).HasMaxLength(50);
            entity.Property(e => e.PreviousStatus).HasMaxLength(40);
            entity.Property(e => e.NewStatus).HasMaxLength(40);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.EmployeeName).HasMaxLength(120);
            entity.HasIndex(e => e.DemoRequestId);
            entity.HasOne(e => e.DemoRequest)
                .WithMany(d => d.Activities)
                .HasForeignKey(e => e.DemoRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =======================
        // MANAGER SEED DATA
        // =======================

        modelBuilder.Entity<Manager>().HasData(
            new Manager
            {
                Id = 1,
                Name = "Shyam",
                Email = "shyam@pirnav.com"
            },
            new Manager
            {
                Id = 2,
                Name = "Kiana",
                Email = "kiana@pirnav.com"
            }
        );

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);


}
