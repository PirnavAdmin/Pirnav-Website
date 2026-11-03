FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
 
WORKDIR /src
 
# Copy all backend files
 
COPY . .
 
# Restore dependencies
 
RUN dotnet restore
 
# Publish app
 
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false
 
# Runtime image
 
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
 
WORKDIR /app
 
ENV ASPNETCORE_HTTP_PORTS=5000
 
COPY --from=build /app/publish .
 
RUN mkdir -p /app/wwwroot/resumes /app/wwwroot/uploads
 
EXPOSE 5000
 
ENTRYPOINT ["dotnet", "Pirnav.API.dll"]

 
