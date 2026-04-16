using Microsoft.EntityFrameworkCore;
using RoadMap.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Добавляем контроллеры
builder.Services.AddControllers();

// 2. Настраиваем Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Настройка БД (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

var app = builder.Build();

// 4. Включаем Swagger UI только в режиме разработки
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        // Делаем так, чтобы Swagger был доступен по адресу /swagger
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        options.RoutePrefix = "swagger"; 
    });
}

app.UseHttpsRedirection();

// 5. Маппим контроллеры
app.MapControllers();

app.Run();