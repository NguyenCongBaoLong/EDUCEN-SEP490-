using EduCen.Models;
using Microsoft.EntityFrameworkCore;
using System;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
builder.Services.AddDbContext<EduCenV2Context>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("MyCnn")));
app.MapGet("/", () => "Hello World!");

app.Run();
