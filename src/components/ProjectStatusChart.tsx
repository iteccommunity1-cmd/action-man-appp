"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectStatusChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export const ProjectStatusChart: React.FC<ProjectStatusChartProps> = ({ data }) => {
  return (
    <Card className="rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-gray-800">Project Status Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center p-0">
        {data.every(item => item.value === 0) ? (
          <div className="text-center text-gray-500 p-8">
            <p className="text-lg">No projects to display chart.</p>
            <p className="text-sm mt-2">Create some projects to see the breakdown!</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};